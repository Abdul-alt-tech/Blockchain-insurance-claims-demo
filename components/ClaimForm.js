import React, { useState } from 'react';
import { ethers } from 'ethers';

function ClaimForm({ contract, policyId }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tx = await contract.submitClaim(
        policyId,
        description,
        ethers.utils.parseEther(amount)
      );
      await tx.wait();
      alert('Claim submitted successfully!');
      setDescription('');
      setAmount('');
    } catch (err) {
      console.error(err);
      alert('Error submitting claim: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="claim-form">
      <h3>Submit New Claim</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Amount (ETH):</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Submit Claim'}
        </button>
      </form>
    </div>
  );
}

export default ClaimForm;