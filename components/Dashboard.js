import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PolicyList from './PolicyList';
import ClaimForm from './ClaimForm';

function Dashboard({ account, contract, isInsurer }) {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [newPolicyForm, setNewPolicyForm] = useState({
    policyHolder: '',
    premium: '',
    coverageAmount: '',
    durationInDays: '365'
  });

  useEffect(() => {
    if (contract && account) {
      loadPolicies();
    }
  }, [contract, account]);

  const loadPolicies = async () => {
    try {
      const policyCount = await contract.policyCount();
      const loadedPolicies = [];
      
      for (let i = 1; i <= policyCount; i++) {
        const policy = await contract.policies(i);
        if (isInsurer || policy.policyHolder.toLowerCase() === account.toLowerCase()) {
          loadedPolicies.push({
            id: policy.id.toNumber(),
            policyHolder: policy.policyHolder,
            premium: ethers.utils.formatEther(policy.premium),
            coverageAmount: ethers.utils.formatEther(policy.coverageAmount),
            startDate: new Date(policy.startDate * 1000).toLocaleDateString(),
            endDate: new Date(policy.endDate * 1000).toLocaleDateString(),
            active: policy.active
          });
        }
      }
      
      setPolicies(loadedPolicies);
      loadClaims(loadedPolicies);
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  const loadClaims = async (policies) => {
    try {
      const allClaims = [];
      
      for (const policy of policies) {
        const claimIds = await contract.getClaimsForPolicy(policy.id);
        
        for (const claimId of claimIds) {
          const claim = await contract.claims(claimId);
          allClaims.push({
            id: claim.id.toNumber(),
            policyId: claim.policyId.toNumber(),
            description: claim.description,
            amount: ethers.utils.formatEther(claim.amount),
            status: getStatusText(claim.status),
            dateSubmitted: new Date(claim.dateSubmitted * 1000).toLocaleString()
          });
        }
      }
      
      setClaims(allClaims);
    } catch (error) {
      console.error("Error loading claims:", error);
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 0: return 'Pending';
      case 1: return 'Approved';
      case 2: return 'Rejected';
      case 3: return 'Paid';
      default: return 'Unknown';
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      await contract.createPolicy(
        newPolicyForm.policyHolder,
        ethers.utils.parseEther(newPolicyForm.premium),
        ethers.utils.parseEther(newPolicyForm.coverageAmount),
        newPolicyForm.durationInDays,
        { from: account }
      );
      alert('Policy created successfully!');
      setNewPolicyForm({
        policyHolder: '',
        premium: '',
        coverageAmount: '',
        durationInDays: '365'
      });
      loadPolicies();
    } catch (error) {
      console.error("Error creating policy:", error);
      alert('Error creating policy: ' + error.message);
    }
  };

  const handleReviewClaim = async (claimId, approve) => {
    try {
      await contract.reviewClaim(claimId, approve, { from: account });
      alert(`Claim ${approve ? 'approved' : 'rejected'} successfully!`);
      loadPolicies();
    } catch (error) {
      console.error("Error reviewing claim:", error);
      alert('Error reviewing claim: ' + error.message);
    }
  };

  const handlePayClaim = async (claimId, amount) => {
    try {
      // Convert amount to wei
      const amountInWei = ethers.utils.parseEther(amount);
      await contract.payClaim(claimId, { from: account, value: amountInWei });
      alert('Claim paid successfully!');
      loadPolicies();
    } catch (error) {
      console.error("Error paying claim:", error);
      alert('Error paying claim: ' + error.message);
    }
  };

  return (
    <div className="dashboard">
      {isInsurer && (
        <div className="create-policy-form">
          <h3>Create New Policy</h3>
          <form onSubmit={handleCreatePolicy}>
            <div>
              <label>Policy Holder Address:</label>
              <input
                type="text"
                value={newPolicyForm.policyHolder}
                onChange={(e) => setNewPolicyForm({...newPolicyForm, policyHolder: e.target.value})}
                required
              />
            </div>
            <div>
              <label>Premium (ETH):</label>
              <input
                type="number"
                step="0.01"
                value={newPolicyForm.premium}
                onChange={(e) => setNewPolicyForm({...newPolicyForm, premium: e.target.value})}
                required
              />
            </div>
            <div>
              <label>Coverage Amount (ETH):</label>
              <input
                type="number"
                step="0.01"
                value={newPolicyForm.coverageAmount}
                onChange={(e) => setNewPolicyForm({...newPolicyForm, coverageAmount: e.target.value})}
                required
              />
            </div>
            <div>
              <label>Duration (Days):</label>
              <input
                type="number"
                value={newPolicyForm.durationInDays}
                onChange={(e) => setNewPolicyForm({...newPolicyForm, durationInDays: e.target.value})}
                required
              />
            </div>
            <button type="submit">Create Policy</button>
          </form>
        </div>
      )}

      <div className="policy-section">
        <h2>{isInsurer ? 'All Policies' : 'Your Policies'}</h2>
        <PolicyList 
          policies={policies} 
          onSelectPolicy={setSelectedPolicy}
          isInsurer={isInsurer}
        />
      </div>

      {selectedPolicy && (
        <div className="claim-section">
          <ClaimForm 
            contract={contract} 
            policyId={selectedPolicy} 
            account={account}
          />
        </div>
      )}

      <div className="claims-list">
        <h2>Claims History</h2>
        {claims.length === 0 ? (
          <p>No claims found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Policy ID</th>
                <th>Description</th>
                <th>Amount (ETH)</th>
                <th>Status</th>
                <th>Date Submitted</th>
                {isInsurer && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr key={claim.id}>
                  <td>{claim.id}</td>
                  <td>{claim.policyId}</td>
                  <td>{claim.description}</td>
                  <td>{claim.amount}</td>
                  <td>{claim.status}</td>
                  <td>{claim.dateSubmitted}</td>
                  {isInsurer && (
                    <td>
                      {claim.status === 'Pending' && (
                        <>
                          <button onClick={() => handleReviewClaim(claim.id, true)}>Approve</button>
                          <button onClick={() => handleReviewClaim(claim.id, false)}>Reject</button>
                        </>
                      )}
                      {claim.status === 'Approved' && (
                        <button onClick={() => handlePayClaim(claim.id, claim.amount)}>Pay Claim</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;