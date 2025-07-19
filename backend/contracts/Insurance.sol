// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Insurance {
    address public insurer;
    
    enum ClaimStatus { Pending, Approved, Rejected, Paid }
    
    struct Policy {
        uint id;
        address policyHolder;
        uint premium;
        uint coverageAmount;
        uint startDate;
        uint endDate;
        bool active;
    }
    
    struct Claim {
        uint id;
        uint policyId;
        string description;
        uint amount;
        ClaimStatus status;
        uint dateSubmitted;
    }
    
    uint public policyCount;
    uint public claimCount;
    
    mapping(uint => Policy) public policies;
    mapping(uint => Claim) public claims;
    mapping(uint => uint[]) public policyClaims; // Policy ID to claim IDs
    
    event PolicyCreated(uint id, address policyHolder);
    event ClaimSubmitted(uint id, uint policyId);
    event ClaimReviewed(uint id, ClaimStatus status);
    event ClaimPaid(uint id, uint amount);
    
    constructor() {
        insurer = msg.sender;
    }
    
    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer can perform this action");
        _;
    }
    
    function createPolicy(
        address _policyHolder,
        uint _premium,
        uint _coverageAmount,
        uint _durationInDays
    ) external onlyInsurer {
        policyCount++;
        policies[policyCount] = Policy(
            policyCount,
            _policyHolder,
            _premium,
            _coverageAmount,
            block.timestamp,
            block.timestamp + (_durationInDays * 1 days),
            true
        );
        
        emit PolicyCreated(policyCount, _policyHolder);
    }
    
    function submitClaim(uint _policyId, string memory _description, uint _amount) external {
        Policy memory policy = policies[_policyId];
        require(policy.active, "Policy is not active");
        require(policy.endDate >= block.timestamp, "Policy has expired");
        require(msg.sender == policy.policyHolder, "Only policy holder can submit claims");
        
        claimCount++;
        claims[claimCount] = Claim(
            claimCount,
            _policyId,
            _description,
            _amount,
            ClaimStatus.Pending,
            block.timestamp
        );
        
        policyClaims[_policyId].push(claimCount);
        emit ClaimSubmitted(claimCount, _policyId);
    }
    
    function reviewClaim(uint _claimId, bool _approve) external onlyInsurer {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.Pending, "Claim already processed");
        
        claim.status = _approve ? ClaimStatus.Approved : ClaimStatus.Rejected;
        emit ClaimReviewed(_claimId, claim.status);
    }
    
    function payClaim(uint _claimId) external payable onlyInsurer {
        Claim storage claim = claims[_claimId];
        Policy memory policy = policies[claim.policyId];
        
        require(claim.status == ClaimStatus.Approved, "Claim not approved");
        require(claim.amount <= policy.coverageAmount, "Claim exceeds coverage");
        require(address(this).balance >= claim.amount, "Insufficient contract balance");
        
        payable(policy.policyHolder).transfer(claim.amount);
        claim.status = ClaimStatus.Paid;
        
        emit ClaimPaid(_claimId, claim.amount);
    }
    
    function getClaimsForPolicy(uint _policyId) external view returns (uint[] memory) {
        return policyClaims[_policyId];
    }
    
    // Accept payments to the contract
    receive() external payable {}
}