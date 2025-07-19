import React from 'react';
import { ethers } from 'ethers';

function PolicyList({ policies, contract }) {
  return (
    <div className="policy-list">
      <h2>Your Policies</h2>
      {policies.length === 0 ? (
        <p>No policies found</p>
      ) : (
        <ul>
          {policies.map((policy) => (
            <li key={policy.id}>
              <h3>Policy #{policy.id}</h3>
              <p>
                <strong>Coverage:</strong> {ethers.utils.formatEther(policy.coverageAmount)} ETH
              </p>
              <p>
                <strong>Premium:</strong> {ethers.utils.formatEther(policy.premium)} ETH
              </p>
              <p>
                <strong>Status:</strong> {policy.active ? 'Active' : 'Inactive'}
              </p>
              <p>
                <strong>Valid until:</strong> {new Date(policy.endDate * 1000).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PolicyList;