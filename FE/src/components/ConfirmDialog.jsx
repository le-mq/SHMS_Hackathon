import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const ConfirmDialog = ({ show, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel", variant = "primary", isAlert = false }) => {
    return (
        <Modal show={show} onHide={onCancel || onConfirm} centered>
            <Modal.Header closeButton style={{ borderBottom: '1px solid #cbd5e1' }}>
                <Modal.Title style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '20px', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                {message}
            </Modal.Body>
            <Modal.Footer style={{ borderTop: 'none', padding: '0 20px 20px 20px', display: 'flex', gap: '10px' }}>
                {!isAlert && (
                    <Button
                        variant="outline-secondary"
                        onClick={onCancel}
                        style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, borderRadius: '6px' }}
                    >
                        {cancelText}
                    </Button>
                )}
                <Button
                    variant={variant}
                    onClick={onConfirm || onCancel}
                    style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        backgroundColor: variant === 'danger' ? '#ef4444' : variant === 'success' ? '#10b981' : '#0d1b2a',
                        borderColor: variant === 'danger' ? '#ef4444' : variant === 'success' ? '#10b981' : '#0d1b2a',
                        color: 'white'
                    }}
                >
                    {confirmText}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConfirmDialog;
export { ConfirmDialog };
