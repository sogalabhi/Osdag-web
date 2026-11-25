"""
Guests are told apart by an address a client cannot choose.

DRF's throttle key comes from X-Forwarded-For. Without NUM_PROXIES it is the whole header, so a
client sending a different header on every request gets a new bucket each time. With NUM_PROXIES=1
only the entry the nearest proxy added counts and anything the client put in front of it is ignored.
"""
from pathlib import Path
from unittest import mock

import pytest
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from rest_framework.test import APIClient, APISimpleTestCase
from rest_framework.throttling import SimpleRateThrottle

from config.settings import _num_proxies

URL = "/api/design/exportCad"
RATES = {"anon": "3/minute", "user": "3/minute", "cad_export_anon": "3/minute"}
# a cheap request that fails validation: the limit counts requests, not exports
BODY = {"module_id": "x", "input_values": {"a": 1}, "format": "step"}


def rest_framework(num_proxies):
    return {**settings.REST_FRAMEWORK, "NUM_PROXIES": num_proxies}


class GuestThrottleBucketTests(APISimpleTestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def statuses(self, forwarded_for_values):
        with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", RATES):
            return [
                self.client.post(URL, BODY, format="json", HTTP_X_FORWARDED_FOR=value, REMOTE_ADDR="10.0.0.2").status_code
                for value in forwarded_for_values
            ]

    def test_forged_leading_address_does_not_give_a_new_bucket_with_one_proxy(self):
        # The proxy appended the real client (203.0.113.7); the client prefixed a new fake address each time.
        forged = [f"198.51.100.{n}, 203.0.113.7" for n in range(1, 6)]
        with override_settings(REST_FRAMEWORK=rest_framework(1)):
            self.assertEqual(self.statuses(forged), [400, 400, 400, 429, 429])

    def test_other_clients_keep_their_own_bucket_with_one_proxy(self):
        with override_settings(REST_FRAMEWORK=rest_framework(1)):
            first = self.statuses(["203.0.113.7"] * 4)
            other = self.statuses(["203.0.113.8"])
        self.assertEqual(first, [400, 400, 400, 429])
        self.assertEqual(other, [400])

    def test_without_proxies_the_header_is_ignored(self):
        forged = [f"198.51.100.{n}, 203.0.113.{n}" for n in range(1, 6)]
        with override_settings(REST_FRAMEWORK=rest_framework(0)):
            self.assertEqual(self.statuses(forged), [400, 400, 400, 429, 429])

    def test_drf_default_without_num_proxies_is_dodgeable(self):
        """The behaviour being closed: no NUM_PROXIES means every distinct header is a new bucket."""
        forged = [f"198.51.100.{n}, 203.0.113.7" for n in range(1, 6)]
        with override_settings(REST_FRAMEWORK=rest_framework(None)):
            self.assertEqual(self.statuses(forged), [400] * 5)


class TestNumProxiesSetting:
    def test_test_settings_have_a_number(self):
        assert settings.REST_FRAMEWORK["NUM_PROXIES"] == 0

    @pytest.mark.parametrize("raw, expected", [(None, 0), ("", 0), (" ", 0), ("0", 0), ("1", 1), (" 2 ", 2)])
    def test_parses_the_environment_variable(self, monkeypatch, raw, expected):
        if raw is None:
            monkeypatch.delenv("NUM_PROXIES", raising=False)
        else:
            monkeypatch.setenv("NUM_PROXIES", raw)
        assert _num_proxies() == expected

    @pytest.mark.parametrize("raw", ["-1", "one", "1.5"])
    def test_rejects_a_value_that_is_not_a_whole_number_of_zero_or_more(self, monkeypatch, raw):
        monkeypatch.setenv("NUM_PROXIES", raw)
        with pytest.raises(ImproperlyConfigured):
            _num_proxies()


def location_block(conf: str, location: str) -> str:
    start = conf.index(f"location {location} {{")
    return conf[start : conf.index("\n    }", start)]


class TestNginxClientAddress:
    """Both proxied routes hand Django the one visitor address, and the WebSocket route is no exception."""

    conf = (Path(__file__).resolve().parents[4] / "frontend" / "nginx.conf").read_text(encoding="utf-8")

    @pytest.mark.parametrize("location", ["/api/", "/ws/"])
    def test_route_sets_the_client_address_headers(self, location):
        block = location_block(self.conf, location)
        assert "proxy_set_header X-Real-IP $client_ip;" in block
        assert "proxy_set_header X-Forwarded-For $client_ip;" in block

    def test_client_chain_is_never_appended_to(self):
        assert "$proxy_add_x_forwarded_for" not in self.conf
