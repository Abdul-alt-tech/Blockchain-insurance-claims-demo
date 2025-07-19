const Insurance = artifacts.require("Insurance");

contract("Insurance", (accounts) => {
  let insurance;
  const [insurer, policyHolder] = accounts;

  before(async () => {
    insurance = await Insurance.new();
  });

  it("should deploy with insurer set correctly", async () => {
    const contractInsurer = await insurance.insurer();
    assert.equal(contractInsurer, insurer, "Insurer address mismatch");
  });

  it("should create a new policy", async () => {
    const premium = web3.utils.toWei("0.1", "ether");
    const coverage = web3.utils.toWei("1", "ether");
    const duration = 365; // days

    await insurance.createPolicy(policyHolder, premium, coverage, duration, { from: insurer });

    const policy = await insurance.policies(1);
    assert.equal(policy.policyHolder, policyHolder, "Policy holder mismatch");
    assert.equal(policy.premium, premium, "Premium amount mismatch");
  });

  it("should submit a claim", async () => {
    const description = "Test claim";
    const amount = web3.utils.toWei("0.5", "ether");

    await insurance.submitClaim(1, description, amount, { from: policyHolder });

    const claim = await insurance.claims(1);
    assert.equal(claim.policyId, 1, "Policy ID mismatch");
    assert.equal(claim.description, description, "Description mismatch");
  });

  it("should approve and pay a claim", async () => {
    // Fund the contract first
    await web3.eth.sendTransaction({
      from: insurer,
      to: insurance.address,
      value: web3.utils.toWei("1", "ether")
    });

    await insurance.reviewClaim(1, true, { from: insurer });
    await insurance.payClaim(1, { from: insurer });

    const claim = await insurance.claims(1);
    assert.equal(claim.status, 3, "Claim should be paid"); // 3 = Paid status
  });
});