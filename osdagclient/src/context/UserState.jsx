import { createContext, useReducer } from "react";
import UserReducer from "./UserReducer";
import { clearAuthStorage } from "../utils/auth";
import { apiBase } from "../api";

// crypto packages
import { decode as base64_decode, encode as base64_encode } from "base-64";

/* 
    ######################################################### 
    # Author : Atharva Pingale ( FOSSEE Summer Fellow '23 ) # 
    ######################################################### 
*/

let initialValue = {
  isLoggedIn: false,
  LoginMessage: "",
  SignupMessage: "",
  OTPSent: false,
  OTPMessage: "",
  passwordSet: false,
  passwordSetMessage: "",
  inputFilesLink: [],
  inputFilesStatus: false,
  inputFilesMessage: "",
  saveInputFileStatus: false,
  saveInputFileName: "",
  loginCredValid: false,
};

// const BASE_URL = "http://127.0.0.1:8000/";
const BASE_URL = `${apiBase}`;

//create context
export const UserContext = createContext(initialValue);

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(UserReducer, initialValue);

  // USER AUTHENTICATION AND AUTHORAZATION
  // Removed: All JWT-related functions (createJWTToken, refreshJWTToken, userLogin, setRefreshTokenCookie)
  // Authentication is now handled by Firebase in LoginPage.jsx and useAuth.js

  const setIsLoggedIn = async (value) => {
    console.log("value :  ", value);
    dispatch({ type: "SET_LOGGED_IN", payload: { isLoggedIn: true } });
    console.log("state.isLoggedIn : ", state.isLoggedIn);
  };

  const obtainSingleInputFile = async (fileIndex) => {
    console.log("inside obtain single input file : ", fileIndex);
    const access_token = localStorage.getItem("access");
    const email = localStorage.getItem("email");
    try {
      console.log("fetching the input file");
      fetch(`${BASE_URL}api/user/obtain-input-file/`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        // Authorization header as well
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          fileIndex: fileIndex,
        }),
      }).then((response) => {
        console.log("found response : ", response);
        if (response.ok) {
          const link = document.createElement("a");
          console.log("response.url : ", response.url);
          const newURL =
            response.url +
            `?filename=${email}_fin_plate_connection_${fileIndex}.osi`;
          console.log("newURL : ", newURL);
          link.href = newURL;
          console.log("link.href : ", link.url);
          link.setAttribute(
            "download",
            `${email}_fin_plate_connection_${fileIndex}.osi`
          );
          link.innerHTML = `${email}_fin_plate_connection_${fileIndex}.osi`;

          // store the link in an array
          dispatch({ type: "PUSH_REPORT_LINK", payload: link });
          console.log("pushed the report link");

          dispatch({
            type: "SET_INPUTFILES_STATUS",
            payload: {
              inputFiles: true,
              inputFilesMessage: "The files have been stored in the server",
            },
          });

          console.log("state.inputFilesLink : ", state.inputFilesLink);
        } else {
          console.error(
            "Error in obtaining the PDF file:",
            response.status,
            response.statusText
          );
          dispatch({
            type: "SET_INPUTFILES_STATUS",
            payload: {
              inputFiles: false,
              inputFilesMessage: "Failed to store the files in the server",
            },
          });
        }
      });
    } catch (err) {
      console.log("Server error in obtaining the file : ", err);
    }
  };

  const obtainAllInputValueFiles = async () => {
    console.log("inside teh obtain All reports thunk");
    state.inputFilesLink = [];
    const access_token = localStorage.getItem("access");
    const allInputValueFilesLength = localStorage.getItem(
      "allInputValueFilesLength"
    );
    console.log("allInputValueFilesLength : ", allInputValueFilesLength);
    console.log("access_token : ", access_token);
    // Fix: Use actual email from localStorage
    const email = localStorage.getItem("email") || "";
    console.log("email : ", email);
    
    if (!email) {
      console.error("No email found in localStorage");
      return;
    }

    // calling the obtainSingleInputFile
    // allInputValueFileLekngth number of times
    for (let fileIndex = 1; fileIndex < allInputValueFilesLength; fileIndex++) {
      obtainSingleInputFile(fileIndex);
    }
  };

  // Removed: verifyEmail - Email verification now handled by Firebase
  // Removed: ForgetPassword - Use Firebase password reset (resetPassword from firebaseAuth.js) instead

  const SaveInputValueFile = async (content) => {
    console.log("inside saveInputValueFile thunk");
    console.log("content : ", content);
    const email = localStorage.getItem("email");
    console.log("email in localStorage : ", email);

    try {
      const response = await fetch(`${BASE_URL}api/user/saveinput/`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content: content,
          email: email,
        }),
      });

      const jsonResponse = await response?.json();
      console.log("jsonResponse : ", jsonResponse);
      if (response.status == 201) {
        console.log("the input file has beed stored successfully");
        const allInputValueFilesLength = jsonResponse.allInputValueFilesLength;
        console.log("allInputValueFilesLength : ", allInputValueFilesLength);
        // set to localStorage
        localStorage.setItem(
          "allInputValueFilesLength",
          allInputValueFilesLength
        );

        dispatch({
          type: "SET_SAVE_INPUT_FILE_STATUS",
          payload: {
            saveInputFileStatus: true,
            fileName: jsonResponse.fileName,
          },
        });

        return {
          saveInputStatus: true,
          saveInputFileName: jsonResponse.fileName,
        };
      } else {
        console.log(
          "response.status!=200 while sending the input values files"
        );

        dispatch({
          type: "SET_SAVE_INPUT_FILE_STATUS",
          payload: { saveInputFileStatus: false },
        });
      }
    } catch (err) {
      console.log("Error in sending the input files : ", err);

      dispatch({
        type: "SET_SAVE_INPUT_FILE_STATUS",
        payload: { saveInputFileStatus: false },
      });
    }
  };


  return (
    <UserContext.Provider
      value={{
        // state variables
        isLoggedIn: state.isLoggedIn,
        OTPSent: state.OTPSent,
        OTPMessage: state.OTPMessage,
        LoginMessage: state.LoginMessage,
        SignupMessage: state.SignupMessage,
        inputFilesLink: state.inputFilesLink,
        saveInputFileStatus: state.saveInputFileStatus,
        loginCredValid: state.loginCredValid,

        // thunks
        obtainAllInputValueFiles,
        SaveInputValueFile,
        setIsLoggedIn,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
