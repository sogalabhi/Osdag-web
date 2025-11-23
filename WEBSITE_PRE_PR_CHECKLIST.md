### OSDAG Web Pre PR Checklist

Watch Video Here [https://youtu.be/JnWH7Bw0z_8]

---

## Start: Run the app (frontend + backend)

- [ ] Backend runs locally
  - [ ] Create/activate venv and install deps (`requirements.txt`)
  - [ ] `python manage.py migrate` succeeds
  - [ ] `python manage.py runserver` starts at `http://127.0.0.1:8000/` without errors
  - [ ] Health endpoint(s) respond (e.g., `GET /`, `GET /api/` if applicable)

- [ ] Frontend runs locally
  - [ ] Install deps in `osdagclient` (or from root)
    - [ ] `npm ci` (root and/or `osdagclient`)
  - [ ] Start dev server from root: `npm run dev` (proxies to `osdagclient`)
  - [ ] App loads at the dev URL (e.g., `http://localhost:5173/`) with no console errors

---

## Home / Landing

- [ ] Login with guest
- [ ] Landing page renders without layout shifts
- [ ] Home/Module Select page boots and matches the video (left navigation matches)
- [ ] Module cards render with correct titles, descriptions, and images
- [ ] Search (modules/files) works and matches results/animations shown in the video

---

## Load inputs using a .osi file

- [ ] Use the sample `.osi` included with the repository to verify load behavior
- [ ] Loading a `.osi` populates all fields correctly
- [ ] No errors in the console or network tab during load

---

## Open a module via its card

- [ ] Navigates to the module page (URL route matches constants)
- [ ] UI shell renders (Inputs, Outputs, Logs docks visible/hidden correctly)
- [ ] The page title and breadcrumbs match the module

---

## UI correctness (Inputs, Outputs, Logs)

- [ ] Inputs dock matches the video (labels, groups, spacings)
- [ ] Outputs dock matches the video (sections, order, spacing, alignment)
- [ ] Logs dock shows design logs and updates on each run
- [ ] Component checkboxes select/unselect components and UI updates accordingly
- [ ] Additional input fields accept values and validations appear where necessary (error/required states)

---

## Save/Load Inputs

- [ ] Save Inputs button downloads a `.osi`
- [ ] Saved `.osi` can be reloaded and produces identical UI state
- [ ] File naming and default location behavior are correct

---

## Design run

- [ ] Enter inputs and click Design — design runs without errors
- [ ] API request includes correct `Module` key and payload
- [ ] API response returns `{ data, logs, success: true }`
- [ ] Outputs update immediately after success

---

## CAD viewport and tooltips

- [ ] Pan, Rotate, Zoom In, Zoom Out work as expected
- [ ] View options (Model/parts) match module configuration and switch correctly
- [ ] 9-view grid buttons change camera correctly and center the model
- [ ] No WebGL errors in the console

---

## Save Outputs

- [ ] Save Outputs triggers file downloads to the chosen directory
- [ ] Files exist and open correctly
- [ ] Filenames, formats and structure match expectations

---

## Report generation

- [ ] Click Generate Report and open the produced PDF
- [ ] Change checkboxes/options and regenerate — PDF reflects changes
- [ ] Save report to Desktop (or chosen location) and confirm 'OK' and file exists

---

## Tabs, Recent projects & Navigation

- [ ] Open home page from the floating navbar
- [ ] Close previous tab — save prompt appears; choose Save and confirm
- [ ] Recent Projects and Recent Modules cards display and animate correctly
- [ ] Search works (search module and search saved file by name)
- [ ] Open module from Recent Projects / Recent Modules entries — verify all available buttons

---

## Dark mode

- [ ] Switch to Dark Mode
- [ ] Repeat the full checklist above and confirm visual correctness
- [ ] All widgets, menus, dialogs, tooltips, and focus/hover states are correct in dark mode
- [ ] No inaccessible contrast levels (check inputs, buttons, links, table rows)

---

## Backend routes and contract sanity

- [ ] `calculate-output/<Module>` endpoint reachable and returns valid JSON
- [ ] Input-data endpoints (if any) respond with expected lists/options
- [ ] CAD endpoint responds with base64 files for all declared sections
- [ ] No CORS issues between frontend and backend in dev

---

## Performance and errors

- [ ] No unhandled promise rejections or React errors in console
- [ ] Network requests are not repeatedly failing/retrying
- [ ] Initial page load is performant; navigation between routes is smooth

---

## Notes

- [ ] Verify module keys match backend registration (see `osdag_api/module_finder.py` and `osdag_api/__init__.py`)
- [ ] Frontend routes align with `osdagclient/src/constants/modules.js`
- [ ] Follow architecture patterns noted in `NEW_MODULE_GUIDE.md`
