import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function PenaltyActionModal({ show, onHide, team, complianceRules, onApplyPenalty }) {
    const [selectedRule, setSelectedRule] = useState('');
    const [penalty, setPenalty] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (selectedRule && complianceRules) {
            const ruleObj = complianceRules.find(r => r.rule === selectedRule);
            if (ruleObj && ruleObj.penalty) {
                setPenalty(ruleObj.penalty);
            } else {
                setPenalty('');
            }
        }
    }, [selectedRule, complianceRules]);
    useEffect(() => {
        if (show) {
            setSelectedRule('');
            setPenalty('');
            setNote('');
        }
    }, [show, team]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyPenalty({
            teamId: team?.id,
            penaltyRule: selectedRule,
            penaltyApplied: penalty,
            penaltyNote: note
        });

        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Apply Penalty for Team: {team?.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="penalty-form">
                    <Form.Group className="mb-3">
                        <Form.Label>Select Violation Rule <span style={{ color: 'red' }}>*</span></Form.Label>
                        <Form.Select value={selectedRule}
                                     onChange={(e) => setSelectedRule(e.target.value)}
                                     required
                        >
                            <option value="">-- Select Rule --</option>
                            {complianceRules && complianceRules.map((cr, idx) => (
                                <option key={idx} value={cr.rule}>
                                    {cr.rule}
                                </option>
                            ))}
                            <option value="Other">Other / Custom</option>
                        </Form.Select>
                    </Form.Group>

                    {selectedRule === 'Other' && (
                        <Form.Group className="mb-3">
                            <Form.Label>Custom Rule Description <span style={{ color: 'red' }}>*</span></Form.Label>
                            <Form.Control type="text" placeholder="Enter custom rule..."
                                          required onChange={(e) => {
                                // Handle custom rule description change if needed
                            }}
                            />
                        </Form.Group>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Penalty to Apply <span style={{ color: 'red' }}>*</span></Form.Label>
                        <Form.Control type="text" value={penalty}
                                      onChange={(e) => setPenalty(e.target.value)}
                                      placeholder="e.g. Disqualification, -10 points" required
                        />
                        <Form.Text className="text-muted">
                            You can modify the default penalty for this specific case.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Additional Notes / Reason</Form.Label>
                        <Form.Control as="textarea"
                                      rows={3} value={note}
                                      onChange={(e) => setNote(e.target.value)}
                                      placeholder="Enter detailed reason or evidence..."
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant="danger" type="submit" form="penalty-form" disabled={!selectedRule || !penalty}>
                    Apply Penalty
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default PenaltyActionModal;
