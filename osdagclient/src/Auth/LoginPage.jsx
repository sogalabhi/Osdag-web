import { useState, useContext, useEffect, useRef } from 'react';
// import { useHistory } from 'react-router-dom';
import icon from '../assets/logo-osdag.png';
// import { createJWTToken } from '../../context/ModuleState';
import { UserContext } from '../context/UserState';
import { Modal, Button, Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
// import google from '../../../ResourceFiles/images/google.png'
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";
import axios from "axios";
import { clearAuthStorage } from "../utils/auth";

const generateRandomString = (length) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    return result;
};
let globalOTP = null;

const LoginPage = () => {
    const navigate = useNavigate();

    const {
        userSignup,
        userLogin,
        loginCredValid,
        verifyEmail,
        ForgetPassword,
        isLoggedIn,
        setIsLoggedIn,
        setJWTLogin,
        LoginMessage,
        SignupMessage,
        OTPMessage
    } = useContext(UserContext);

    // Form states
    const [isSignup, setIsSignup] = useState(false);
    // const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const canvasRef = useRef(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [isOTPLoading, setIsOTPLoading] = useState(false);

    // Error states
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal states
    const [verifyEmailModalVisible, setVerifyEmailModalVisible] = useState(false);
    const [verifyEmails, setVerifyEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isInputDisabled, setInputDisabled] = useState(true);
    const [toggleForgotPassword, setToggleForgotPassword] = useState(false);
    const [fPasswordModalVisible, setFPasswordModalVisible] = useState(false);
    const [fPasswordEmail, setFPasswordEmail] = useState('');
    const [fPasswordNewPass, setFPasswordNewPass] = useState('');

    useEffect(() => {
        if (isLoggedIn) {
            navigate('/home');
        }
    }, [isLoggedIn]);

    // Clear errors when switching between login/signup
    useEffect(() => {
        setErrors({});
        setGeneralError('');
        setSuccessMessage('');
    }, [isSignup]);

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    const validateForm = () => {
        const newErrors = {};

        // if (!username.trim()) {
        //     newErrors.username = 'Username is required';
        // } else if (username.length < 3) {
        //     newErrors.username = 'Username must be at least 3 characters long';
        // }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(email)) {
            newErrors.email = '1) Please enter a valid email address';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        }

        // Confirm Password validation
        if (isSignup) {

            if (!confirmPassword.trim()) {
                newErrors.confirmPassword = 'Please confirm your password';
            } else if (confirmPassword !== password) {
                newErrors.confirmPassword = 'Passwords do not match';
            }

            if (!captchaInput.trim()) {
                newErrors.captcha = "Please enter the CAPTCHA";
            } else if (captchaInput.trim().toLowerCase() !== captcha.toLowerCase()) {
                newErrors.captcha = "CAPTCHA does not match";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSwitch = () => {
        setIsSignup(!isSignup);
        // setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    // Handle EmailVerification
    const handleVerifyEmailModal = () => {
        setVerifyEmailModalVisible(true);
        setToggleForgotPassword(true);
        setVerifyEmail('');
        setOtp('');
        setInputDisabled(true);
    };

    const handleVerifyEmailModalClose = () => {
        setVerifyEmailModalVisible(false);
        setToggleForgotPassword(false);
        setVerifyEmail('');
        setOtp('');
        setInputDisabled(true);
    };

    const handleVerifyEmail = async () => {
        if (!verifyEmails.trim()) {
            setGeneralError("Please enter your email address");
            return;
        }

        if (!validateEmail(verifyEmails)) {
            setGeneralError("Please enter a valid email address");
            return;
        }

        setIsOTPLoading(true);
        setGeneralError('');

        try {
            const response = await verifyEmail(verifyEmails);
            if (response && response.success) {
                globalOTP = localStorage.getItem('otp');
                setInputDisabled(false);
                setSuccessMessage("OTP sent successfully to your email");
            } else {
                setGeneralError(response?.message || "Failed to send OTP");
            }
        } catch (error) {
            setGeneralError("Error sending OTP. Please try again.");
        } finally {
            setIsOTPLoading(false);
        }
    };

    const handleVerify = () => {
        if (!otp.trim()) {
            setGeneralError("Please enter the OTP");
            return;
        }

        const storedOTP = localStorage.getItem('otp');

        if (storedOTP === otp) {
            localStorage.removeItem('otp');
            globalOTP = null;
            setSuccessMessage("OTP verification successful");

            if (loginCredValid && !toggleForgotPassword) {
                setIsLoggedIn(true);
            } else if (toggleForgotPassword) {
                handleFPasswordModal();
                handleVerifyEmailModalClose();
            }
        } else {
            setGeneralError("Invalid OTP. Please check and try again.");
        }
    };

    // Handle Forgot password
    const handleFPasswordModal = () => {
        setFPasswordModalVisible(true);
        setFPasswordEmail('');
        setFPasswordNewPass('');
    };

    const handleFPasswordModalClose = () => {
        setFPasswordModalVisible(false);
        setFPasswordEmail('');
        setFPasswordNewPass('');
    };

    const handleFPassword = async () => {
        if (!fPasswordNewPass.trim()) {
            setGeneralError("Please enter a new password");
            return;
        }

        if (fPasswordNewPass.length < 8) {
            setGeneralError("Password must be at least 8 characters long");
            return;
        }

        setIsLoading(true);
        setGeneralError('');

        try {
            const response = await ForgetPassword(fPasswordNewPass);
            if (response && response.success) {
                setSuccessMessage("Password updated successfully! You can now log in.");
                handleFPasswordModalClose();
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                setGeneralError(response?.message || "Failed to update password");
            }
        } catch (error) {
            setGeneralError("Error updating password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setGeneralError('');
        setSuccessMessage('');

        try {
            if (isSignup) {
                const response = await userSignup(email, password, confirmPassword, false);

                if (response && response.success) {
                    setSuccessMessage("Account created successfully! You can now log in.");
                    setIsSignup(false);
                    // setUsername('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    generateCaptcha(); // reset captcha
                } else {
                    setGeneralError(response?.message || "Failed to create account");
                }
            } else {
                console.log("Logging in with email:", email);
                const response = await userLogin(email, password, false);

                // if (response && response.success) {
                //     localStorage.setItem("email", email);
                //     if (response.isGuest) {
                //         navigate('/home');
                //     } else {
                //         // For regular users, they need email verification
                //         setVerifyEmailModalVisible(true);
                //     }
                // }
                if (response && response.success) {

                    // Save tokens returned by your backend
                    if (response.access) localStorage.setItem("access", response.access);
                    if (response.refresh) localStorage.setItem("refresh", response.refresh);
                
                    localStorage.setItem("email", email);
                
                    navigate('/home');  // 🚀 LOGIN SUCCESS — GO TO DASHBOARD
                } else {
                    setGeneralError(response?.message || "Login failed");
                }
            }
        } catch (error) {
            setGeneralError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestSignIn = async () => {
        setIsLoading(true);
        setGeneralError('');

        try {
            clearAuthStorage();
            let guestEmail = `GUEST.${generateRandomString(10)}@gmail.com`;
            const guestPassword = generateRandomString(12);

            const response = await userLogin(guestEmail, guestPassword, true);

            if (response && response.success) {
                localStorage.setItem("email", guestEmail);
                navigate('/home');
            } else {
                setGeneralError("Failed to enter guest mode. Please try again.");
            }
        } catch (error) {
            setGeneralError("Error entering guest mode. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // 🔹 Google Sign-In logic
    
  const googleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();

      // Step 1️⃣: Sign in with Firebase popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Step 2️⃣: Get Firebase ID token
      const idToken = await user.getIdToken();

      // Step 3️⃣: Send token to Django backend for verification
      const host = "http://localhost:8000"; // Django backend
      const response = await axios.post(`${host}/api/auth/firebase-login/`, {
        token: idToken,
      });
        const { data } = response;
        clearAuthStorage();
        const resolvedEmail = data?.email || user.email || "";
        const resolvedUsername =
          data?.email?.split("@")[0] || user.displayName || "GoogleUser";

        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        localStorage.setItem("userType", "user");
        localStorage.setItem("email", resolvedEmail);
        localStorage.setItem("username", resolvedUsername);

        // keep context state in sync with storage
        if (typeof setJWTLogin === "function") {
          await setJWTLogin(true);
        } else {
          setIsLoggedIn(true);
        }

        navigate("/home");
    } catch (error) {
      console.error("Firebase Google Login Error:", error);

      if (error.response) {
      const backendError = error.response.data.error;

        if (backendError === "Email does not exist. Please register first.") {
            alert("This email is not registered. Please sign up first.");
        } else if (backendError === "Invalid Firebase token") {
            alert("Invalid Google authentication. Please try again.");
        } else {
            alert(`Login failed: ${backendError}`);
        }
     } else {
      // Handle network or other errors
      alert("Something went wrong. Please check your connection and try again.");
     }
    } finally {
      setIsLoading(false);
    }
    };

     // Generate random captcha text
    const generateCaptchaText = () => {
        const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        let text = "";
        for (let i = 0; i < 6; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return text;
    };
    // Draw captcha with noise
    const drawCaptcha = (text) => {
        const canvas = canvasRef.current;
        if (!canvas) return; // ✅ Prevent null access
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#f3f4f6");
        gradient.addColorStop(1, "#e5e7eb");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw curved noise lines
        for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, Math.random() * height);
        for (let j = 0; j < width; j += 20) {
            ctx.lineTo(
            j,
            Math.sin(j / 10 + Math.random() * 2 * Math.PI) * 5 + height / 2
            );
        }
        ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${
            Math.random() * 255
        }, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        }

        // Draw text (random font, size, rotation)
        const baseFontSize = 26;
        const letterSpacing = width / (text.length + 1);

        for (let i = 0; i < text.length; i++) {
        const x = letterSpacing * (i + 0.8);
        const y = height / 2 + Math.random() * 10 - 5;
        const angle = (Math.random() - 0.5) * 0.6;
        const fontSize = baseFontSize + Math.random() * 6;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = `hsl(${Math.random() * 360}, 60%, 30%)`;
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
        }

        // Add heavy random dots
        for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${
            Math.random() * 255
        }, 0.4)`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 1.3, 0, 2 * Math.PI);
        ctx.fill();
        }

        // Add random small text as background noise
        for (let i = 0; i < 10; i++) {
        ctx.save();
        ctx.font = "10px sans-serif";
        ctx.fillStyle = `rgba(0,0,0,0.05)`;
        ctx.translate(Math.random() * width, Math.random() * height);
        ctx.rotate(Math.random() * 2 * Math.PI);
        ctx.fillText(
            generateCaptchaText().slice(0, 3),
            0,
            0
        );
        ctx.restore();
        }

    };
    // Generate new captcha
    const generateCaptcha = () => {
        const newCaptcha = generateCaptchaText();
        setCaptcha(newCaptcha);
        // drawCaptcha(newCaptcha);
    };

    useEffect(() => {
        if (captcha && canvasRef.current) {
        drawCaptcha(captcha);
        }
    }, [captcha, canvasRef.current]);

     // Generate once on mount
    useEffect(() => {
        generateCaptcha();
    }, []);


    return (
        <>
          <section style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', marginLeft: '50px', marginTop: '50px', width: '100%' }}>
            <div className="w-full max-w-md bg-white rounded-lg p-6">
            {/* Logo */}
            <img
                src={icon}
                alt="stack overflow"
                className="mb-8"
                height={150}
                width={300}
                style={{ padding: '0px 0px 0px 60px', marginBottom: '0px' }}  
            />

            {/* Alerts */}
            <div className="w-full max-w-md space-y-4">
                {generalError && (
                <Alert
                    message={generalError}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setGeneralError("")}
                />
                )}
                {successMessage && (
                <Alert
                    message={successMessage}
                    type="success"
                    showIcon
                    closable
                    onClose={() => setSuccessMessage("")}
                />
                )}
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-white rounded-lg p-6">
                <h2 className="text-center text-lg font-semibold mb-6">
                {isSignup ? "Create an account" : "Log in to Osdag"}
                </h2>

                {/* Google buttons */}
                <div className="space-y-3 mb-6">
                    {(!isSignup) ? 
                <Button
                    onClick={handleGuestSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-2 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 font-medium hover:bg-gray-100"
                >
                    <span className="w-5 h-5 text-xl">👤</span>
                    Continue as Guest
                </Button> : null}
                <Button
                    onClick={googleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-2 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 font-medium hover:bg-gray-100"
                    >
                    <img
                        src="https://developers.google.com/identity/images/g-logo.png"
                        alt="Google Logo"
                        className="w-5 h-5"
                    />
                    {isSignup ? "Continue with Google" : "Log in with Google"}
                </Button>

                    
                </div>

                <div className="relative flex items-center justify-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-3 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Email & Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                        </label>
                        <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-osdag-green ${
                            errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        />
                        {errors.email && (
                        <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                        </label>
                        <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-osdag-green ${
                            errors.password ? "border-red-500" : "border-gray-300"
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                            {showPassword ? (
                                                // Eye Slash SVG
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.477 10.477a3 3 0 104.243 4.243M9.88 9.88A4.5 4.5 0 0114.12 14.12M6.44 6.44C4.5 8.07 3 10.4 3 12c0 1.6 1.5 3.93 3.44 5.56A11.975 11.975 0 0012 18a11.975 11.975 0 005.56-1.44C19.5 15.93 21 13.6 21 12c0-1.6-1.5-3.93-3.44-5.56A11.975 11.975 0 0012 6c-1.43 0-2.81.26-4.06.72" />
                                                </svg>
                                            ) : (
                                                // Eye SVG
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.332 4.5 12 4.5c4.668 0 8.577 3.01 9.964 7.183.07.2.07.438 0 .639C20.577 16.49 16.668 19.5 12 19.5c-4.668 0-8.577-3.01-9.964-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                        </button>
                        </div>
                        {errors.password && (
                        <span className="text-red-500 text-xs mt-1 block">{errors.password}</span>
                        )}
                        </div>
                        {isSignup && (
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm Password
                            </label>
                            <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-osdag-green ${
                                errors.confirmPassword ? "border-red-500" : "border-gray-300"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                            >
                                {showConfirmPassword ? (
                                                    // Eye Slash SVG
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.477 10.477a3 3 0 104.243 4.243M9.88 9.88A4.5 4.5 0 0114.12 14.12M6.44 6.44C4.5 8.07 3 10.4 3 12c0 1.6 1.5 3.93 3.44 5.56A11.975 11.975 0 0012 18a11.975 11.975 0 005.56-1.44C19.5 15.93 21 13.6 21 12c0-1.6-1.5-3.93-3.44-5.56A11.975 11.975 0 0012 6c-1.43 0-2.81.26-4.06.72" />
                                                    </svg>
                                                ) : (
                                                    // Eye SVG
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.332 4.5 12 4.5c4.668 0 8.577 3.01 9.964 7.183.07.2.07.438 0 .639C20.577 16.49 16.668 19.5 12 19.5c-4.668 0-8.577-3.01-9.964-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                            </button>
                            </div>
                            {errors.confirmPassword && (
                            <span className="text-red-500 text-xs mt-1 block">{errors.confirmPassword}</span>
                            )}
                        
                        </div>
                        )}

                        {isSignup && (
                            <div className="flex items-center text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    id="check"
                                    className="h-4 w-4 text-osdag-green border-gray-300 rounded focus:ring-osdag-green"
                                />
                                {/* <label htmlFor="check" className="ml-2 text-sm font-medium cursor-pointer">
                                    Terms and Conditions
                                </label> */}
                                <label
                                    htmlFor="check"
                                    className="ml-2 text-sm font-medium cursor-pointer underline"
                                    onClick={() => {
                                        const width = 500;
                                        const height = 300;
                                        const left = window.screenX + (window.outerWidth - width) / 2;
                                        const top = window.screenY + (window.outerHeight - height) / 2;

                                        const popup = window.open(
                                        "",
                                        "TermsAndConditions",
                                        `width=${width},height=${height},left=${left},top=${top}`
                                        );

                                        popup.document.write(`
                                        <html>
                                            <head>
                                            <title>Terms & Conditions</title>
                                            </head>
                                            <body style="font-family: Arial; text-align:center; margin-top:50px;">
                                            <h2>🚧 Under Development 🚧</h2>
                                            </body>
                                        </html>
                                        `);
                                    }}
                                    >
                                    Terms and Conditions
                                    </label>

                            </div>
                        )}    
                        {/* CAPTCHA */}
                        {isSignup && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                            CAPTCHA
                            </label>
                            <canvas
                            ref={canvasRef}
                            width={200}
                            height={60}
                            className="border border-gray-300 rounded-md mb-2"
                            ></canvas>
                            <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={captchaInput}
                                onChange={(e) => setCaptchaInput(e.target.value)}
                                placeholder="Enter CAPTCHA"
                                className={`flex-grow px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-osdag-green ${
                                errors.captcha ? "border-red-500" : "border-gray-300"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={generateCaptcha}
                                className="px-3 py-2 bg-osdag-green text-white rounded-md text-sm hover:bg-osdag-dark-green"
                            >
                                Refresh
                            </button>
                            </div>
                            {errors.captcha && (
                            <span className="text-red-500 text-xs mt-1 block">{errors.captcha}</span>
                            )}
                        </div>
                        )}  
                
                        {!isSignup && (
                        <p
                            className="text-osdag-green text-sm cursor-pointer hover:underline mt-1"
                            onClick={handleVerifyEmailModal}
                        >
                            Forgot password?
                        </p>
                        )}
                    

                        {/* </div> */}

                        {/* Login / Signup button */}
                        <button
                            type="submit"
                            className="w-full py-2 bg-osdag-green text-white rounded-md font-medium hover:bg-osdag-dark-green transition"
                            disabled={isLoading}
                        >
                            {isLoading ? <Spin size="small" /> : isSignup ? "Sign up" : "Log in"}
                        </button>
                </form>

                    {/* Toggle login/signup */}
                    <p className="text-center text-sm text-gray-600 mt-4">
                    {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
                    <button
                        type="button"
                        onClick={handleSwitch}
                        className="text-osdag-green hover:underline font-medium"
                        disabled={isLoading}
                    >
                        {isSignup ? "Log in" : "Sign up"}
                    </button>
                    </p>
            </div>
            {/* Verify Email Popup */}
            <Modal
                title="Email Verification"
                visible={verifyEmailModalVisible}
                onCancel={handleVerifyEmailModalClose}
                footer={[
                    <Button key="cancel" onClick={handleVerifyEmailModalClose}>
                        Cancel
                    </Button>,
                ]}
                maskClosable={false}
            >
                <div className='flex flex-col gap-4'>
                    <img src={icon} alt='stack overflow' className='self-center py-2.5' height={110} width={300} />

                    {generalError && (
                        <Alert
                            message={generalError}
                            type="error"
                            showIcon
                            className='mb-4'
                        />
                    )}

                    {successMessage && (
                        <Alert
                            message={successMessage}
                            type="success"
                            showIcon
                            className='mb-4'
                        />
                    )}

                    <label htmlFor="verifyemail" className='flex flex-col'>
                        <h4 className='mb-2 mt-0'>Email:</h4>
                        <input
                            type="email"
                            name='verifyemail'
                            id='verifyemail'
                            value={verifyEmails}
                            onChange={(e) => setVerifyEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className='p-2.5 w-full border border-gray-300 text-sm m-1.5 rounded transition-colors duration-300 focus:outline-none focus:border-osdag-green focus:shadow-[0_0_0_2px_rgba(145,176,20,0.1)]'
                        />
                    </label>

                    <label htmlFor="otp" className='flex flex-col'>
                        <h4 className='mb-2 mt-0'>Enter OTP:</h4>
                        <input
                            type="text"
                            name='otp'
                            id='otp'
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            disabled={isInputDisabled}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className='p-2.5 w-full border border-gray-300 text-sm m-1.5 rounded transition-colors duration-300 focus:outline-none focus:border-osdag-green focus:shadow-[0_0_0_2px_rgba(145,176,20,0.1)] disabled:bg-gray-100 disabled:cursor-not-allowed'
                        />
                    </label>

                    <div className='flex gap-2.5 mt-4'>
                        <Button
                            key="getotp"
                            onClick={handleVerifyEmail}
                            loading={isOTPLoading}
                            disabled={!verifyEmails.trim()}
                        >
                            Get OTP
                        </Button>
                        <Button
                            key="verifyemailbtn"
                            type="primary"
                            onClick={handleVerify}
                            disabled={isInputDisabled || !otp.trim()}
                        >
                            Verify
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Forgot Password Popup */}
            <Modal
                title="Reset Password"
                visible={fPasswordModalVisible}
                onCancel={handleFPasswordModalClose}
                footer={[
                    <Button key="cancel" onClick={handleFPasswordModalClose}>
                        Cancel
                    </Button>,
                    <Button
                        key="update"
                        type="primary"
                        onClick={handleFPassword}
                        loading={isLoading}
                        disabled={!fPasswordNewPass.trim()}
                    >
                        Update Password
                    </Button>,
                ]}
                maskClosable={false}
            >
                <div>
                    {generalError && (
                        <Alert
                            message={generalError}
                            type="error"
                            showIcon
                            className='mb-4'
                        />
                    )}

                    <label htmlFor="newpassword" className='flex flex-col'>
                        <h4 className='mb-2 mt-0'>New Password:</h4>
                        <input
                            type="password"
                            name='newpassword'
                            id='newpassword'
                            value={fPasswordNewPass}
                            onChange={(e) => setFPasswordNewPass(e.target.value)}
                            placeholder="Enter new password (min 8 characters)"
                            className='p-2.5 w-full border border-gray-300 text-sm m-1.5 rounded transition-colors duration-300 focus:outline-none focus:border-osdag-green focus:shadow-[0_0_0_2px_rgba(145,176,20,0.1)]'
                        />
                    </label>
                </div>
            </Modal>

            
            </div>
            </section> 
        </>
    );
};

export default LoginPage;