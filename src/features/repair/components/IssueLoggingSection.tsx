import { VEHICLE_SYSTEM_OPTIONS, ROOT_CAUSE_OPTIONS } from '../../../lib/mockConfig';
import { Button } from '../../../components/ui/Button';

import { RepairIssue } from '../../../types';

interface IssueLoggingSectionProps {
  issues: RepairIssue[];
  setIssues: React.Dispatch<React.SetStateAction<RepairIssue[]>>;
  createNewIssue: () => RepairIssue;
}

export function IssueLoggingSection({
  issues,
  setIssues,
  createNewIssue,
}: IssueLoggingSectionProps) {
  const handleUpdateIssue = (issueId: string, field: 'vehicleSystem' | 'rootCause' | 'description', value: string) => {
    setIssues((current) =>
      current.map((issue) => (issue.id === issueId ? { ...issue, [field]: value } : issue)),
    );
  };

  const handleAddIssue = () => {
    if (issues.length >= 10) {
      return;
    }
    setIssues((current) => [...current, createNewIssue()]);
  };

  const handleRemoveIssue = (issueId: string) => {
    if (issues.length <= 1) {
      return;
    }
    setIssues((current) => current.filter((issue) => issue.id !== issueId));
  };

  return (
    <div>
      <h3 className="section-title">Repair issue logging</h3>
      {issues.map((issue, index) => (
        <div key={issue.id} className="issue-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <h4>Issue {index + 1}</h4>
            {issues.length > 1 && (
              <button
                type="button"
                className="button secondary small"
                onClick={() => handleRemoveIssue(issue.id)}
              >
                Remove
              </button>
            )}
          </div>
          <div className="field-grid" style={{ marginTop: 16 }}>
            <div className="input-group">
              <label className="label" htmlFor={`vehicleSystem-${issue.id}`}>
                Vehicle system
              </label>
              <select
                id={`vehicleSystem-${issue.id}`}
                className="select"
                value={issue.vehicleSystem}
                onChange={(event) => handleUpdateIssue(issue.id, 'vehicleSystem', event.target.value)}
              >
                {VEHICLE_SYSTEM_OPTIONS.map((system) => (
                  <option key={system} value={system}>
                    {system}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor={`rootCause-${issue.id}`}>
                Root cause
              </label>
              <select
                id={`rootCause-${issue.id}`}
                className="select"
                value={issue.rootCause}
                onChange={(event) => handleUpdateIssue(issue.id, 'rootCause', event.target.value)}
              >
                {ROOT_CAUSE_OPTIONS.map((cause) => (
                  <option key={cause} value={cause}>
                    {cause}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="input-group" style={{ marginTop: 16 }}>
            <label className="label" htmlFor={`issueDescription-${issue.id}`}>
              Repair description <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id={`issueDescription-${issue.id}`}
              className="textarea"
              rows={4}
              maxLength={500}
              value={issue.description}
              onChange={(event) => handleUpdateIssue(issue.id, 'description', event.target.value)}
              placeholder="Enter a detailed issue description"
            />
            <p className="small-note">Maximum 500 characters per issue.</p>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button type="button" onClick={handleAddIssue} disabled={issues.length >= 10}>
          Add another issue
        </Button>
        <p className="small-note">You can add up to 10 issue entries in one ticket.</p>
      </div>
    </div>
  );
}
