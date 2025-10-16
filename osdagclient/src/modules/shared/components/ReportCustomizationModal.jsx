import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Input, Button, Upload, Tree, Checkbox, Spin, message } from 'antd';

const { TreeNode } = Tree;

export const ReportCustomizationModal = ({
  isOpen,
  onCancel,
  onOpenPDF,
  onSavePDF,
  reportId,
  sections = {},
  selectedSections = [],
  onSectionsChange,
  loading = false
}) => {
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [compilingPDF, setCompilingPDF] = useState(false);

  // Initialize checked keys when sections change
  useEffect(() => {
    console.log('[ReportCustomizationModal] sections:received', { sectionsKeys: Object.keys(sections || {}) });
    if (sections && Object.keys(sections).length > 0) {
      const allKeys = [];
      Object.keys(sections).forEach(section => {
        allKeys.push(section);
        if (sections[section] && sections[section].length > 0) {
          sections[section].forEach(subsection => {
            allKeys.push(`${section}/${subsection}`);
          });
        }
      });
      setCheckedKeys(allKeys);
      setExpandedKeys(Object.keys(sections));
    }
  }, [sections]);

  const onCheck = (checkedKeysValue, info) => {
    console.log('[ReportCustomizationModal] onCheck', { count: checkedKeysValue?.length });
    setCheckedKeys(checkedKeysValue);
    onSectionsChange && onSectionsChange(checkedKeysValue);
  };

  const onExpand = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const renderTreeNodes = (sections) => {
    return Object.keys(sections).map(section => {
      const subsections = sections[section] || [];
      const children = subsections.map(subsection => (
        <TreeNode
          title={subsection}
          key={`${section}/${subsection}`}
          isLeaf
        />
      ));

      return (
        <TreeNode
          title={section}
          key={section}
          children={children}
        />
      );
    });
  };

  const handleSelectAll = () => {
    const allKeys = [];
    Object.keys(sections).forEach(section => {
      allKeys.push(section);
      if (sections[section] && sections[section].length > 0) {
        sections[section].forEach(subsection => {
          allKeys.push(`${section}/${subsection}`);
        });
      }
    });
    setCheckedKeys(allKeys);
    onSectionsChange && onSectionsChange(allKeys);
  };

  const handleSelectNone = () => {
    setCheckedKeys([]);
    onSectionsChange && onSectionsChange([]);
  };

  const handleOpenPDF = async () => {
    console.log('[ReportCustomizationModal] handleOpenPDF', { reportId });
    if (selectedSections.length === 0) {
      message.error("Please select at least one section to include.");
      return;
    }

    setCompilingPDF(true);
    try {
      await onOpenPDF(selectedSections);
    } catch (error) {
      message.error("Failed to open PDF. Please try again.");
    } finally {
      setCompilingPDF(false);
    }
  };

  const handleSavePDF = async () => {
    console.log('[ReportCustomizationModal] handleSavePDF', { reportId });
    if (selectedSections.length === 0) {
      message.error("Please select at least one section to include.");
      return;
    }

    setCompilingPDF(true);
    try {
      await onSavePDF(selectedSections);
    } catch (error) {
      message.error("Failed to save PDF. Please try again.");
    } finally {
      setCompilingPDF(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onCancel}
      footer={null}
      title="Customize and Save Design Report"
      width={600}
      style={{
        border: '1px solid #90af13',
      }}
      styles={{
        header: {
          backgroundColor: '#90af13',
          color: 'white',
          borderBottom: '1px solid #90af13',
        }
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '10px 0', color: '#333' }}>
          Customize Report Sections
        </h3>
        <p style={{ marginBottom: 12, color: '#666' }}>
          Select which sections to include in your customized report:
        </p>
        <div style={{ marginBottom: 12 }}>
          <Button 
            size="small" 
            onClick={handleSelectAll} 
            style={{ 
              marginRight: 8,
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '5px',
              border: '1px solid black',
            }}
          >
            Select All
          </Button>
          <Button 
            size="small" 
            onClick={handleSelectNone}
            style={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '5px',
              border: '1px solid black',
            }}
          >
            Select None
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p>Loading sections...</p>
        </div>
      ) : (
        <div style={{ 
          border: '1px solid #a6a6a6',
          borderRadius: '6px',
          backgroundColor: 'white',
          padding: '8px',
          marginBottom: 16
        }}>
          <Tree
            checkable
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onCheck={onCheck}
            checkedKeys={checkedKeys}
            style={{ 
              maxHeight: 300, 
              overflowY: 'auto',
              backgroundColor: 'white',
            }}
          >
            {renderTreeNodes(sections)}
          </Tree>
        </div>
      )}

      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          <strong>Selected sections:</strong> {checkedKeys.length} of {Object.keys(sections).length + Object.values(sections).flat().length} total
        </p>
      </div>

      {/* Action Buttons - Matching Desktop Layout */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "20px",
        paddingTop: "15px",
        borderTop: "1px solid #f0f0f0"
      }}>
        <Button 
          onClick={handleOpenPDF}
          loading={compilingPDF}
          style={{
            backgroundColor: 'white',
            color: 'black',
            fontWeight: 'bold',
            borderRadius: '5px',
            border: '1px solid black',
            padding: '5px 14px',
          }}
        >
          Open PDF
        </Button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button 
            onClick={handleSavePDF}
            loading={compilingPDF}
            style={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '5px',
              border: '1px solid black',
              padding: '5px 14px',
            }}
          >
            Save PDF
          </Button>
          <Button 
            onClick={onCancel}
            style={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '5px',
              border: '1px solid black',
              padding: '5px 14px',
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
