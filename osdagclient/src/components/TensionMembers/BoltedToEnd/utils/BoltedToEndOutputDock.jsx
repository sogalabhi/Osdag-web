import React from "react";
import { Button, Input } from "antd";
import "../../../../App.css";

function BoltedToEndOutputDock({ output }) {
    const [isPatternModalOpen, setPatternModalOpen] = React.useState(false);
    const [patternData, setPatternData] = React.useState({
        title: "",
        function: null,
    });

    const handlePatternClick = (title, patternFunction) => {
        setPatternData({
            title,
            function: patternFunction,
        });
        setPatternModalOpen(true);
    };

    if (!output) {
        return (
            <>
                <p>Output Dock</p>
                <div className="subMainBody scroll-data">
                    <div className="component-grid">
                        <div className="component-grid-align">
                            <h4>No output to display. Submit the design to see results.</h4>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <p>Output Dock</p>
            <div className="subMainBody scroll-data">
                {Object.keys(output).map((key, i) => {
                    if (key === "NULL") return null;
                    return (
                        <div key={i}>
                            <h3>{key}</h3>
                            <div>
                                {output[key].map((item, index) => {
                                    if (item.label === "Pattern" || item.label === "Spacing Details") {
                                        return (
                                            <div key={index} className="component-grid">
                                                <div className="component-grid-align">
                                                    <h4>{item.label}</h4>
                                                    <Input
                                                        className="btn"
                                                        type="button"
                                                        value={item.label}
                                                        onClick={() => handlePatternClick(item.label, item.val)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={index} className="component-grid">
                                                <div className="component-grid-align">
                                                    <h4>{item.label}</h4>
                                                    <Input
                                                        type="text"
                                                        style={{
                                                            color: "rgb(0 0 0 / 67%)",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                        }}
                                                        name={`${key}_${item.label}`}
                                                        value={item.val}
                                                        disabled
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Pattern modal */}
                {isPatternModalOpen && patternData.function && (
                    <div className="pattern-modal">
                        <div className="pattern-modal-content">
                            <div className="pattern-modal-header">
                                <h2>{patternData.title}</h2>
                                <span
                                    className="pattern-modal-close"
                                    onClick={() => setPatternModalOpen(false)}
                                >
                                    &times;
                                </span>
                            </div>
                            <div className="pattern-modal-body">
                                {patternData.function(true).map((content, index) => {
                                    if (content[2] === "TYPE_IMAGE") {
                                        return (
                                            <div key={index} className="pattern-image-container">
                                                <img
                                                    src={content[3][0]}
                                                    alt={content[3][3]}
                                                    width={content[3][1]}
                                                    height={content[3][2]}
                                                />
                                                <p>{content[3][3]}</p>
                                            </div>
                                        );
                                    } else if (content[2] === "TYPE_TEXTBOX") {
                                        return (
                                            <div key={index} className="pattern-item">
                                                <div className="pattern-label">
                                                    <strong>{content[1]}</strong>
                                                </div>
                                                <div className="pattern-value">{content[3]}</div>
                                            </div>
                                        );
                                    } else if (content[2] === "TYPE_NOTE") {
                                        return (
                                            <div key={index} className="pattern-note">
                                                <p>{content[1]}</p>
                                            </div>
                                        );
                                    } else if (content[2] === "TYPE_SECTION") {
                                        return (
                                            <div key={index} className="pattern-section">
                                                <h3>{content[1]}</h3>
                                                <div className="pattern-image-container">
                                                    <img
                                                        src={content[3][0]}
                                                        alt={content[3][3]}
                                                        width={content[3][1]}
                                                        height={content[3][2]}
                                                    />
                                                    <p>{content[3][3]}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                            <div className="pattern-modal-footer">
                                <Button onClick={() => setPatternModalOpen(false)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default BoltedToEndOutputDock;
