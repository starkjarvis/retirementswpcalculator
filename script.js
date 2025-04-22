// Format numbers as INR currency
function formatCurrency(value) {
  return "₹" + value.toLocaleString("en-IN");
}

function calculate() {
  document.getElementById('inputSummary').innerHTML = '';
  document.getElementById('results').innerHTML = '';

  const retirementAge = parseInt(document.getElementById("retirementAge").value);
  const endAge = parseInt(document.getElementById("endAge").value);
  const totalInvestedAmount = parseFloat(document.getElementById("totalInvestedAmount").value);
  const expectedXIRR = parseFloat(document.getElementById("expectedXIRR").value);
  const monthlySWP = parseFloat(document.getElementById("monthlySWP").value);
  const swpTopUpPercent = parseFloat(document.getElementById("swpTopUpPercent").value);

  let balance = totalInvestedAmount;
  let swp = monthlySWP;
  let totalTaxPaid = 0;
  const result = [];

  for (let age = retirementAge; age <= endAge; age++) {
    const swpThisYear = swp * 12;
    balance -= swpThisYear;
    if (balance < 0) balance = 0;

    let taxPaid = 0;
    if (balance > 0) {
      const gain = balance * (expectedXIRR / 100);
      taxPaid = gain * 0.10;
      balance += gain - taxPaid;
    }

    totalTaxPaid += taxPaid;

    result.push({
      age,
      totalInvestedAmount: formatCurrency(totalInvestedAmount),
      monthlySWP: formatCurrency(swp),
      taxPaid: formatCurrency(taxPaid),
      balance: formatCurrency(balance),
    });

    swp *= 1 + (swpTopUpPercent / 100);
    if (balance <= 0) break;
  }

  displayResults(result, totalTaxPaid);

  if (balance === 0 && result[result.length - 1].age < endAge) {
    const requiredCorpus = calculateRequiredCorpus({
      retirementAge,
      endAge,
      expectedXIRR,
      monthlySWP,
      swpTopUpPercent
    });

    const safeSWP = calculateSafeSWP({
      retirementAge,
      endAge,
      expectedXIRR,
      totalInvestedAmount,
      swpTopUpPercent
    });

    document.getElementById('inputSummary').innerHTML += `
      <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mt-6 text-gray-800">
        <h3 class="font-semibold mb-2 text-lg">🛑 Your money runs out at age ${result[result.length - 1].age}!</h3>
        <p class="mb-2">Here are two options to fix this:</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>
            💼 <strong>Option 1:</strong> You should have <strong>${formatCurrency(requiredCorpus)}</strong> corpus at retirement to sustain current SWP till age ${endAge}.
          </li>
          <li>
            💸 <strong>Option 2:</strong> With current corpus, you should withdraw <strong>${formatCurrency(safeSWP)}</strong> per month so your funds last till ${endAge}.
          </li>
        </ul>
      </div>
    `;
  }
}

function displayResults(result, totalTaxPaid) {
  const tableContainer = document.getElementById("results");
  let tableHTML = `
    <table class="min-w-full bg-white shadow-md rounded-lg">
      <thead>
        <tr class="text-gray-700">
          <th class="py-2 px-4 border-b">Age</th>
          <th class="py-2 px-4 border-b">Total Invested Amount</th>
          <th class="py-2 px-4 border-b">SWP (Monthly)</th>
          <th class="py-2 px-4 border-b">Tax Paid</th>
          <th class="py-2 px-4 border-b">Remaining Balance</th>
        </tr>
      </thead>
      <tbody>
  `;
  result.forEach(row => {
    tableHTML += `
      <tr class="text-gray-800">
        <td class="py-2 px-4 border-b">${row.age}</td>
        <td class="py-2 px-4 border-b">${row.totalInvestedAmount}</td>
        <td class="py-2 px-4 border-b">${row.monthlySWP}</td>
        <td class="py-2 px-4 border-b">${row.taxPaid}</td>
        <td class="py-2 px-4 border-b">${row.balance}</td>
      </tr>
    `;
  });
  tableHTML += `
      </tbody>
    </table>

    <div class="mt-4 text-lg text-gray-800 font-semibold">
      🧾 Total Tax Paid Over Retirement: <span class="text-red-600">${formatCurrency(totalTaxPaid)}</span>
    </div>
  `;

  tableContainer.innerHTML = tableHTML;
}

function calculateRequiredCorpus({ retirementAge, endAge, expectedXIRR, monthlySWP, swpTopUpPercent }) {
  let low = monthlySWP * 12;
  let high = 10_00_00_000;
  let result = high;

  while (high - low > 1_000) {
    const mid = (low + high) / 2;
    if (simulateProjection(mid, retirementAge, endAge, expectedXIRR, monthlySWP, swpTopUpPercent)) {
      result = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.round(result);
}

function calculateSafeSWP({ retirementAge, endAge, expectedXIRR, totalInvestedAmount, swpTopUpPercent }) {
  let low = 100;
  let high = 5_00_000;
  let result = low;

  while (high - low > 10) {
    const mid = (low + high) / 2;
    if (simulateProjection(totalInvestedAmount, retirementAge, endAge, expectedXIRR, mid, swpTopUpPercent)) {
      result = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.round(result);
}

function simulateProjection(startBalance, retirementAge, endAge, expectedXIRR, monthlySWP, swpTopUpPercent) {
  let balance = startBalance;
  let swp = monthlySWP;

  for (let age = retirementAge; age <= endAge; age++) {
    const swpThisYear = swp * 12;
    balance -= swpThisYear;
    if (balance < 0) return false;

    const gain = balance * (expectedXIRR / 100);
    const tax = gain * 0.10;
    balance += gain - tax;

    swp *= 1 + (swpTopUpPercent / 100);
  }

  return true;
}
