import { useState, useContext, useEffect } from 'react';
// import { useHistory } from 'react-router-dom';
import icon from '../../assets/logo-osdag.png';
// import { createJWTToken } from '../../context/ModuleState';
import { UserContext } from '../../context/UserState';
import { Modal, Button, Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

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
        LoginMessage,
        SignupMessage,
        OTPMessage
    } = useContext(UserContext);

    // Form states
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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
        console.log("inside use effect in login page and isloggedin is:" + isLoggedIn)
        console.log("Done Action : inside use effect in login page and isloggedin")

        if (isLoggedIn) {
            console.log("isloggedin is true in side if statement of Loginpage")
            navigate('/home');
            console.log("inside If in login page and isloggedin is:" + isLoggedIn)
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

        if (!username.trim()) {
            newErrors.username = 'Username is required';
        } else if (username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters long';
        }

        if (isSignup && !email.trim()) {
            newErrors.email = 'Email is required';
        } else if (isSignup && !validateEmail(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSwitch = () => {
        setIsSignup(!isSignup);
        setUsername('');
        setEmail('');
        setPassword('');
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
                const response = await userSignup(username, email, password, false);

                if (response && response.success) {
                    setSuccessMessage("Account created successfully! You can now log in.");
                    setIsSignup(false);
                    setUsername('');
                    setEmail('');
                    setPassword('');
                } else {
                    setGeneralError(response?.message || "Failed to create account");
                }
            } else {
                const response = await userLogin(username, password, false);

                if (response && response.success) {
                    localStorage.setItem("username", username);
                    if (response.isGuest) {
                        navigate('/home');
                    } else {
                        // For regular users, they need email verification
                        setVerifyEmailModalVisible(true);
                    }
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

    // Google Auth
    const handleGoogleSignIn = () => {
        console.log('Google Sign-In button clicked!');
    };
    // Guest 

    const handleGuestSignIn = async () => {
        setIsLoading(true);
        setGeneralError('');

        try {
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


    return (
        <>
            <section className='min-h-screen min-w-screen mx-auto bg-white flex justify-center items-center'>
                {isSignup && <img src={icon} alt='stack overflow' className='p-5 pr-8' height={180} width={500} />}
                <div className='min-w-[20%] flex flex-col justify-center items-center rounded-[3rem]'>
                    {!isSignup && <img src={icon} alt='stack overflow' className='p-5 pr-8' height={110} width={300} />}

                    {/* Display general alerts */}
                    {generalError && (
                        <Alert
                            message={generalError}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setGeneralError('')}
                            style={{ marginBottom: '16px', width: '400px' }}
                        />
                    )}

                    {successMessage && (
                        <Alert
                            message={successMessage}
                            type="success"
                            showIcon
                            closable
                            onClose={() => setSuccessMessage('')}
                            style={{ marginBottom: '16px', width: '400px' }}
                        />
                    )}

                    <div className='flex flex-row gap-4 mb-4'>
                        {/*<button className="google-signin-button" onClick={handleGoogleSignIn}>
                    <img className="google-logo" src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo" />
                    Sign in with Google
                </button> */}
                        <button
                            className="inline-block px-5 py-3 text-base font-bold text-white bg-osdag-green border border-black rounded cursor-pointer transition-colors duration-300 hover:bg-osdag-dark-green focus:outline-none active:bg-osdag-dark-green disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            onClick={handleGuestSignIn}
                            disabled={isLoading}
                        >
                            {isLoading ? <Spin size="small" /> : 'Guest Mode'}
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className='w-full min-w-[300px] md:min-w-[400px] p-4 md:p-5 bg-white rounded-[10px] flex flex-col justify-evenly shadow-auth m-2 md:m-4'>
                        {
                            isSignup && (
                                <label htmlFor="email" className='flex flex-col'>
                                    <h4 className='mb-1.5 mt-2.5'>Email *</h4>
                                    <input
                                        type="email"
                                        name='email'
                                        id='email'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`p-2.5 w-full border border-gray-300 text-sm m-1.5 rounded transition-colors duration-300 focus:outline-none focus:border-osdag-green focus:shadow-[0_0_0_2px_rgba(145,176,20,0.1)] ${errors.email ? 'border-red-500' : ''}`}
                                    />
                                    {errors.email && <span className='text-red-500 text-xs mt-1 block'>{errors.email}</span>}
                                </label>

                            )
                        }
                        <label htmlFor='name'>
                            <h4>Username *</h4>
                            <input
                                type="text"
                                id='name'
                                name='name'
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={`p-2.5 w-full border border-gray-300 text-sm m-1.5 rounded transition-colors duration-300 focus:outline-none focus:border-osdag-green focus:shadow-[0_0_0_2px_rgba(145,176,20,0.1)] ${errors.username ? 'border-red-500' : ''}`}
                            />
                            {errors.username && <span className='text-red-500 text-xs mt-1 block'>{errors.username}</span>}
                        </label>

                        <label htmlFor='password' className='flex flex-col'>
                            <div className='flex justify-between'>
                                <h4 className='mb-1.5 mt-2.5'>Password *</h4>
                            </div>
                            <input
                                type="password"
                                name='password'
                                id='password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`p-2.5 w-full border border-gray-300 text-sm m-1.5 rounded transition-colors duration-300 focus:outline-none focus:border-osdag-green focus:shadow-[0_0_0_2px_rgba(145,176,20,0.1)] ${errors.password ? 'border-red-500' : ''}`}
                            />
                            {errors.password && <span className='text-red-500 text-xs mt-1 block'>{errors.password}</span>}
                            {!isSignup && <p className='text-osdag-green text-sm cursor-pointer hover:underline' onClick={handleVerifyEmailModal} >Forgot Password?</p>}
                        </label>
                        {isSignup && <p className='text-osdag-text-secondary text-sm'>Passwords must contain at least eight<br />characters, including at least 1 letter and 1<br /> number.</p>}
                        {
                            isSignup && (
                                <div className='flex flex-row items-center'>
                                    <input
                                        type="checkbox"
                                        id="check"
                                        height={80}
                                        width={80}
                                    />
                                    <label htmlFor="check" className='ml-2'>
                                        <p className='text-sm m-0'>Terms,<br />And Conditions.</p>
                                    </label>
                                </div>
                            )
                        }
                        <button type='submit' className='mt-2.5 py-2.5 px-1.5 bg-osdag-green border border-black text-white rounded cursor-pointer transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-osdag-dark-green disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed' disabled={isLoading}>{isLoading ? <Spin size="small" /> : (isSignup ? 'Sign up' : 'Log in')}</button>
                        {
                            isSignup && (
                                <p className='text-osdag-text-secondary text-sm'>
                                    By clicking "Sign up", you agree to our
                                    <span className='text-osdag-green'> terms of<br /> service</span>,
                                    <span className='text-osdag-green'> privacy policy</span> and
                                    <span className='text-osdag-green'> cookie policy</span>
                                </p>
                            )
                        }
                    </form>
                    <p>
                        {isSignup ? 'Already have an account?' : "Don't have an account?"}
                        <button type='button' className='bg-transparent text-osdag-green border-none text-sm cursor-pointer transition-colors duration-200 hover:text-osdag-dark-green hover:underline disabled:text-gray-300 disabled:cursor-not-allowed' onClick={handleSwitch} disabled={isLoading}>{isSignup ? "Log in" : 'sign up'}</button>
                    </p>
                </div>
            </section>
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

        </>
    );
};

export default LoginPage;
