import React, { useState } from "react";
import "./aboutOsdag.css";
import fullosdagLogo from "../../assets/homepage/Logo_osdag.svg";
import osdagLogo from "../../assets/homepage/osdag_logo.png";
import fosseeLogo from "../../assets/homepage/fossee_logo.png";
import iitbLogo from "../../assets/homepage/iitb_logo.png";
import insdagLogo from "../../assets/homepage/insdag_logo.png";
import moeLogo from "../../assets/homepage/moe_logo.png";
import mosLogo from "../../assets/homepage/mos_logo.png";
import constructsteelLogo from "../../assets/homepage/constructsteel_logo.png";

const TABS = [
  "About",
  "Contributors",
  "Acknowledgements",
  "License",
  "Privacy Policy",
  "Caveats",
];

export default function AboutOsdag({ onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="about-dialog-backdrop">
      <div className="about-dialog">

        {/* Title Bar */}
        <div className="about-titlebar">
          <span style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <img src={osdagLogo} alt="Osdag Logo" style={{width: "20px", height: "20px"}} />About Osdag
          </span>
          <button
            className="close-btn"
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e74c3c";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "black";
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              padding: "8px 14px",
              cursor: "pointer"
            }}
          >
             ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="about-tabs">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`about-tab ${activeTab === i ? "active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="about-content">
          {activeTab === 0 && <AboutTab />}
          {activeTab === 1 && <ContributorsTab />}
          {activeTab === 2 && <AcknowledgementsTab />}
          {activeTab === 3 && <LicenseTab />}
          {activeTab === 4 && <PrivacyTab />}
          {activeTab === 5 && <CaveatsTab />}
        </div>

        {/* Footer */}
        <div className="about-footer">
          <button className="ok-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

function AboutTab() {
  return (
    <>
      <img
        src={fullosdagLogo}
        alt="Osdag Logo"
        className="about-logo"
      />

      <h3 className="font-bold mb-2">About Osdag</h3>
      <div className="text-[8px] leading-tight" style={{ fontFamily: "Roboto, Arial, Helvetica, sans-serif" }}>

      <p className="mb-3 text-justify" style={{fontSize:"13px", lineHeight:"normal"}}>
        Osdag is a cross-platform, free, and open-source software for the design and detailing of steel structures, following the Indian Standard{" "} IS 800:2007. Osdag is primarily built on Python using other FOSS tools, such as PySide, OpenCascade, PythonOCC, and SQLite. It allows the
        user to design steel connections, members and systems using a graphical user interface. The interactive GUI provides a 3D visualisation of the designed component and an option to export the CAD model to any drafting or BIM software for the creation of construction/fabrication drawings.
        The design is typically optimised following industry best practices.
      </p>

      <p className="mb-3 text-justify" style={{fontSize:"13px", lineHeight:"normal"}}>
        Osdag is developed by the Osdag team at IIT Bombay, beginning under the umbrella of FOSSEE. Its development has been supported with funding from the Ministry of Education (MoE), Govt. of India, Ministry of Steel (MoS),
        Govt. of India, consteel, and INSDAG.
      </p>

      <p className="mb-3 text-justify" style={{fontSize:"13px", lineHeight:"normal"}}>
        This program comes with ABSOLUTELY NO WARRANTY. This is a free software, and you are welcome to redistribute it under the conditions of LGPL v3 license. See the "LICENSE.txt" file for details of this license.
      </p>

      <p className="mb-3 text-justify" style={{fontSize:"13px", lineHeight:"normal"}}>
        <b>Authors:</b> Osdag Team{" "}
        <a
          href="https://osdag.fossee.in/team"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
         https://osdag.fossee.in/team
        </a>
      </p>

      <p className="mb-3 text-justify" style={{fontSize:"13px", lineHeight:"normal"}}>
        Visit{" "}
        <a
          href="https://osdag.fossee.in"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
         https://osdag.fossee.in
        </a>{" "}
        for more information.
      </p>
      
      <hr className="border-black my-3" />
      
      <p className="mb-3 text-justify" style={{fontSize:"13px", lineHeight:"normal"}}>
        Osdag® and the Osdag logo are registered trademarks of Indian Institute of Technology Bombay (IIT Bombay).
      </p>
      </div>
    </>
  );
}

function ContributorsTab() {
  const staff = [
    "Aditya Donde",
    "Ajinkya Dahale",
    "Ajmal Babu MS",
    "Anand Swaroop",
    "Christo George",
    "Danish Ansari",
    "Darshan Vishwakarma",
    "Deepa Chaudhari",
    "Deepthi Reddy",
    "Jayant Patil",
    "Kumari Anjali Jatav",
    "N Dharma Teja",
    "Nidhi Khare",
    "Parth Karia",
    "Radhika Pagade",
    "Rahul Benal",
    "Reshma Konjari",
    "Rutvik Joshi",
    "Shihabuddin Khan",
    "Siddesh Chavan",
    "Sourabh Das",
    "Subhrajit Dutta",
    "Suchita Lad",
    "Suhel Hashmi",
    "Swastik Gupta",
    "Swathi M",
    "Thushara Pushkaran",
    "Yash Lokhande"
  ];
  const interns = [
    "Aamir Durrany",
    "Aaranyak Ghosh",
    "Aathithya Sharan",
    "Abhijith Sogal",
    "Aditya Mayle",
    "Aditya Pawar",
    "Aditya Wagh",
    "Adnan Abdullah",
    "Agam Arora",
    "Aman Agarwal",
    "Amay Dixit",
    "Amir Chappalwala",
    "Amrutha J",
    "Anshul Kumar Singh",
    "Ansari Mohammad Umair",
    "Anuranjani",
    "Anushka Bajpai",
    "Arbaz Khan",
    "Arushi",
    "Aryamaan Pandey",
    "Aryan Gupta",
    "Atharva Dhavale",
    "Atharva Pingale",
    "Aum Ghelani",
    "Azhar Khan",
    "Chaman Lal Yadav",
    "Debayan Ghosh",
    "Dhimanth Kumar Singh",
    "Eeshu",
    "Faizan Khan",
    "Faran Imam",
    "Garvit Singh Rathore",
    "Gourav Najwani",
    "Harsh Chelani",
    "Harsh Gondal",
    "Harshit Mahour",
    "Harshan S",
    "Himanshu Singh",
    "Ishan Rai",
    "Jerin Jiss George",
    "Jawwad Ahmad",
    "Koustav Bhattacharjee",
    "Lakshana Shree S",
    "Manas Budhiraja",
    "Manav Sharma",
    "Mayank Agarwal",
    "Mehendi Hasan",
    "Mohammad Azhar U Din Mir",
    "Mohammad Suhail",
    "Mohammad Taha",
    "Mohd Faraz Khan",
    "Mohit Rana",
    "Mosam Patel",
    "Mukunth AG",
    "Navnit Kumar",
    "Navtej",
    "Nandagopal VS",
    "Nikhil Kapoor",
    "Nishi Kant Mandal",
    "Nitin Singh",
    "Om Lakshkar",
    "Pragya Thakur",
    "Pramila Kumari",
    "Prathamesh Varma",
    "Prince Sahu",
    "Prerna Praveen Vidyarthi",
    "Priti Kumari",
    "Rachna Gupta",
    "Raghav Sharma",
    "Rajesh Dalai",
    "Ranvir Singh",
    "Renu",
    "Ritik Kumar",
    "Riyaz Khan",
    "Roushan Raj",
    "Rupali Agarwal",
    "Sachin Saud",
    "Sai Charan",
    "Sagar Rathore",
    "Sakshi Shamrao Jadhav",
    "Samarpita Das",
    "Sandipan Bhattacherjee",
    "Sanket Gaikwad",
    "Sasank Navuri",
    "Satyam Singh Niranjan",
    "Saumya Mishra",
    "Shahadad PP",
    "Shreya Bhende",
    "Shubham Kumar",
    "Sreejesh S",
    "Srinivas Raghav",
    "Steve Sojan",
    "Sumagna Das",
    "Suraj Bhosale",
    "Suryajith",
    "Sushree Sangita",
    "Swaroop N",
    "Sweta Pal",
    "Tanmay Kalla",
    "Tanu Singh",
    "Tarandeep Singh Juneja",
    "Yash Lokhande",
    "Yugh Juneja",
    "Zunzunia Arsil",
  ];
  const iitb_stud = [
    "Allan L Marbaniang",
    "Annu Kumari",
    "Aravind P",
    "Bhumik Halani",
    "Devesh Kumar",
    "Jeffy Jahfar",
    "Mayur Mistry",
    "Neela Lakshmi",
    "Sasir Pentyala",
    "Sharayu Korade",
  ];
  const advisors = [
    "Harshvardhan Subbarao (Construma Consultancy Pvt Ltd, Mumbai)",
    "Kannan Moudgalya (formerly with FOSSEE, IIT Bombay, Mumbai)",
    "Manas M Ghosh (INSDAG, Kolkata)",
    "Meera Raghunandan (IIT Bombay, Mumbai)",
    "PC Ashwin Kumar (IIT Roorkee, Roorkee)",
    "Prabhu Ramachandran (FOSSEE, IIT Bombay, Mumbai)",
    "Pradyumna M (Independent Consultant, Bengaluru)",
    "Pratip Bhattacharya (formerly with Tata Consulting Engineers Ltd, Kolkata)",
    "Rupen Goswami (IIT Madras, Chennai)",
    "Somnath Mukherjee (formerly with MN Dastur & Co (P) Ltd, Kolkata)",
    "SR Satish Kumar (IIT Madras, Chennai)",
    "V Kalyanaraman (formerly with IIT Madras, Chennai)",
    "Yogesh D Pisal (Aker Powergas Pvt Ltd, Mumbai)",
  ];
  const pm_staff = [
    "Kiran Kishore",
    "Lee Thomas Stephen",
    "Nagesh Karmali",
    "Sunil Shetye",
    "Usha Viswanathan",
    "Vineeta Parmar",
  ];
  return (
    <div className="contributors">
      <h3 className="font-bold mb-2 text-xl">Project Investigator</h3>
      <p>
        Siddhartha Ghosh, Professor, Dept. of Civil Engineering, IIT Bombay, Mumbai
      </p>

      <h3 className="font-bold mb-2 text-xl">Project Research Staff</h3>
      <ul className="staff-list">
        {staff.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>

      <h3 className="font-bold mb-2 text-xl">Project Interns</h3>
      <ul className="staff-list">
        {interns.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>

      <h3 className="font-bold mb-2 text-xl">IITB Students</h3>
      <ul className="staff-list">
        {iitb_stud.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>

      <h3 className="font-bold mb-2 text-xl">Advisors</h3>
      <ul className="staff-list">
        {advisors.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>

      <h3 className="font-bold mb-2 text-xl">Project Management Staff</h3>
      <ul className="staff-list">
        {pm_staff.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

function AcknowledgementsTab() {
  return (
    <>
      <div classname="ack-block">
      <h2 className="font-bold mb-1 text-xl">Acknowledgements</h2>

      <p>Osdag acknowledges the support and contributions of the following organizations:</p>
      </div>

      <Acknowledgement
        name="Department of Civil Engineering, IIT Bombay"
        url="https://www.civil.iitb.ac.in/"
        logo={iitbLogo}
        className="h-16 object-contain"
      />

      <Acknowledgement
        name="constructsteel"
        url="https://constructsteel.org/"
        logo={constructsteelLogo}
        className="h-7 object-contain"
      />

      <Acknowledgement
        name="FOSSEE"
        url="https://fossee.in/"
        logo={fosseeLogo}
        className="h-16 object-contain"
      />

      <Acknowledgement
        name="INSDAG"
        url="https://insdag.org/"
        logo={insdagLogo}
        className="h-18 object-contain"
      />

      <Acknowledgement
        name="Ministry of Steel"
        url="https://steel.gov.in/"
        logo={mosLogo}
        className="h-16 object-contain"
      />
    </>
  );
}

function Acknowledgement({ name, url, logo, className }) {
  return (
    <div className="ack-block">
      <h3>
        <a href={url} target="_blank" rel="noreferrer">
          {name}
        </a>
      </h3>
      <img src={logo} alt={name} className={className}/>
    </div>
  );
}

function LicenseTab() {
  return (
<>
    <pre className="license-text">
{`Osdag is licensed under the terms of the LGPL v3 license, as stated below.

Osdag is a free software: you can redistribute it and/or modify it under the
terms of the GNU Lesser General Public License as published by the Free Software 
Foundation, version 3 of the License.

This programme is distributed in the hope that it will be useful, but WITHOUT 
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more 
details.
                        
You should have received a copy of the GNU Lesser General Public License along 
with this program. If not, see <http://www.gnu.org/licenses/>

Notice of Third Party Software Licenses

Osdag contains open-source software packages from third parties. These are 
available on an "as is" basis and subject to their individual license agreements.
These licenses are available in ‘license-dependencies.txt’. These third party tools 
are subject to their individual licenses as well as the Osdag license.`}
</pre>

<div style={{ borderTop: "1px solid #000", margin: "10px 0" }}></div>

<pre className="license-text">

{`GNU LESSER GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. 
Everyone is permitted to copy and distribute verbatim copies of this license document,
but changing it is not allowed.

This version of the GNU Lesser General Public License incorporates the terms and
conditions of version 3 of the GNU General Public License, supplemented by the
additional permissions listed below.`}
</pre>

<pre className="license-text" 
    style={{
    lineHeight: "1.6",
    whiteSpace: "pre",
    overflowX: "auto",
    margin: 0
  }}>
{`0. Additional Definitions.

    As used herein, "this License" refers to version 3 of the GNU Lesser General Public
    License, and the "GNU GPL" refers to version 3 of the GNU General Public License.

    "The Library" refers to a covered work governed by this License, other than an
    Application or a Combined Work as defined below.

    An "Application" is any work that makes use of an interface provided by the Library,
    but which is not otherwise based on the Library. Defining a subclass of a class
    defined by the Library is deemed a mode of using an interface provided by the Library.

    A "Combined Work" is a work produced by combining or linking an Application with the
    Library. The particular version of the Library with which the Combined Work was made
    is also called the "Linked Version".

    The "Minimal Corresponding Source" for a Combined Work means the Corresponding Source
    for the Combined Work, excluding any source code for portions of the Combined Work
    that, considered in isolation, are based on the Application, and not on the Linked
    Version.

    The "Corresponding Application Code" for a Combined Work means the object code and/or
    source code for the Application, including any data and utility programs needed for
    reproducing the Combined Work from the Application, but excluding the System Libraries
    of the Combined Work.

1. Exception to Section 3 of the GNU GPL.

    You may convey a covered work under sections 3 and 4 of this License without being
    bound by section 3 of the GNU GPL.

2. Conveying Modified Versions.

    If you modify a copy of the Library, and, in your modifications, a facility refers to
    a function or data to be supplied by an Application that uses the facility (other than
    as an argument passed when the facility is invoked), then you may convey a copy of the
    modified version:

    a) under this License, provided that you make a good faith effort to ensure that, in
        the event an Application does not supply the function or data, the facility still
        operates, and performs whatever part of its purpose remains meaningful, or

    b) under the GNU GPL, with none of the additional permissions of this License
        applicable to that copy.

3. Object Code Incorporating Material from Library Header Files.

    The object code form of an Application may incorporate material from a header file
    that is part of the Library. You may convey such object code under terms of your
    choice, provided that, if the incorporated material is not limited to numerical
    parameters, data structure layouts and accessors, or small macros, inline functions
    and templates (ten or fewer lines in length), you do both of the following:

    a) Give prominent notice with each copy of the object code that the Library is used
        in it and that the Library and its use are covered by this License.

    b) Accompany the object code with a copy of the GNU GPL and this license document.

4. Combined Works.

    You may convey a Combined Work under terms of your choice that, taken together,
    effectively do not restrict modification of the portions of the Library contained in
    the Combined Work and reverse engineering for debugging such modifications, if you
    also do each of the following:

    a) Give prominent notice with each copy of the Combined Work that the Library is used
        in it and that the Library and its use are covered by this License.

    b) Accompany the Combined Work with a copy of the GNU GPL and this license document.

    c) For a Combined Work that displays copyright notices during execution, include the
        copyright notice for the Library among these notices, as well as a reference directing
        the user to the copies of the GNU GPL and this license document.

    d) Do one of the following:

        0) Convey the Minimal Corresponding Source under the terms of this License, and the
        Corresponding Application Code in a form suitable for, and under terms that permit,
        the user to recombine or relink the Application with a modified version of the Linked
        Version to produce a modified Combined Work, in the manner specified by section 6 of
        the GNU GPL for conveying Corresponding Source.

        1) Use a suitable shared library mechanism for linking with the Library. A suitable
        mechanism is one that (a) uses at run time a copy of the Library already present on the
        user's computer system, and (b) will operate properly with a modified version of the
        Library that is interface-compatible with the Linked Version.

    e) Provide Installation Information, but only if you would otherwise be required to
    provide such information under section 6 of the GNU GPL, and only to the extent that
    such information is necessary to install and execute a modified version of the
    Combined Work produced by recombining or relinking the Application with a modified
    version of the Linked Version.

5. Combined Libraries.

    You may place library facilities that are a work based on the Library side by side in
    a single library together with other library facilities that are not Applications and
    are not covered by this License, and convey such a combined library under terms of
    your choice, if you do both of the following:

    a) Accompany the combined library with a copy of the same work based on the Library,
        uncombined with any other library facilities, conveyed under the terms of this
        License.

    b) Give prominent notice with the combined library that part of it is a work based on
        the Library, and explaining where to find the accompanying uncombined form of the same
        work.

6. Revised Versions of the GNU Lesser General Public License.

    The Free Software Foundation may publish revised and/or new versions of the GNU Lesser
    General Public License from time to time.

    Each version is given a distinguishing version number. If the Library as you received
    it specifies that a certain numbered version of the GNU Lesser General Public License
    "or any later version" applies to it, you have the option of following the terms and
    conditions either of that published version or of any later version published by the
    Free Software Foundation. If the Library as you received it does not specify a version
    number of the GNU Lesser General Public License, you may choose any version of the GNU
    Lesser General Public License ever published by the Free Software Foundation.

    If the Library as you received it specifies that a proxy can decide whether future
    versions of the GNU Lesser General Public License shall apply, that proxy's public
    statement of acceptance of any version is permanent authorization for you to choose
    that version for the Library.`}
    </pre>
  </>
  );
}

function PrivacyTab() {
  return (
    <>
      <div
        style={{
          padding: "20px",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        <h2 style={{ marginBottom: "12px", color:"black", fontWeight: "bold"}}>Privacy Policy</h2>

        <p style={{ marginBottom: "10px" }}>
           Osdag does not collect, transmit, share or use any personal data.
        </p>

        <p style={{ marginBottom: "10px" }}>
           The Osdag developers’ community does not condone any unauthorised usage of
           private data, so our software does not gather or send personal data.
        </p>

        <p>
           The Osdag software does not contain any trackers or advertisements.
        </p>
      </div>
    </>
  );
}

function CaveatsTab() {
  return (
    <>
    <div style={{ padding: "20px" }}>
  
      <h2 style={{ marginBottom: "12px", color: "black", fontWeight: "bold" }}>
        Caveats
      </h2>

      <p style={{ marginBottom: "12px", color: "black", fontSize:"13px", lineHeight:"normal"}}>
        Osdag can perform the design of various steel structural connections, members and systems.
        However, Osdag should not be solely relied upon for their complete design. The output from
        Osdag shall be owned by the individual structural designer, and the designer also remains
        responsible for the final design submitted to the client, along with associated documents.
      </p>

      <p style={{ marginBottom: "12px", color: "black", fontSize:"13px", lineHeight:"normal"}}>
        It is very important to note that the Osdag design algorithms can be modified by individual
        users, since it is an open-source software. The Osdag team shall not be liable for any
        further modification, development, or enhancement, until and unless these have been
        officially released by the team. We encourage the use of Osdag design reports (unabridged)
        between the designer and the reviewer for clarity on code compliance and openness.
      </p>

      <p style={{ color: "black", fontSize:"13px", lineHeight:"normal"}}>
        While running, Osdag uses local persistent storage for logs, configuration files, cache,
        thumbnails, recently accessed files, and similar other information for faster subsequent
        runs. These information may contain private data, but stays only on the local storage of
        the device.
      </p>

    </div>
    </>
  );
}
