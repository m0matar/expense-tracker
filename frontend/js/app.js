const API_URL = "http://localhost:3000/api/expenses";

let expenses = [];

const expenseForm = document.getElementById("expenseForm");
const expenseTableBody = document.getElementById("expenseTableBody");
const categoryFilter = document.getElementById("categoryFilter");
const loadingSpinner = document.getElementById("loadingSpinner");
const alertContainer = document.getElementById("alertContainer");

const totalAmount = document.getElementById("totalAmount");
const expenseCount = document.getElementById("expenseCount");
const highestExpense = document.getElementById("highestExpense");

const summaryMonth = document.getElementById("summaryMonth");
const monthlyTotal = document.getElementById("monthlyTotal");
const monthlyCount = document.getElementById("monthlyCount");
const monthlyAverage = document.getElementById("monthlyAverage");
const monthlyHighest = document.getElementById("monthlyHighest");
const categorySummary = document.getElementById("categorySummary");

function showSpinner() {
  loadingSpinner.classList.remove("d-none");
}

function hideSpinner() {
  loadingSpinner.classList.add("d-none");
}

function showAlert(message, type = "danger") {
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

async function getExpenses() {
  try {
    showSpinner();

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Failed to get expenses");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    showAlert(
      "Could not load expenses. Please make sure the server is running."
    );
    return [];
  } finally {
    hideSpinner();
  }
}
function populateMonthSelector() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  summaryMonth.innerHTML = "";

  months.forEach((monthName, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");

    const option = document.createElement("option");

    option.value = `${currentYear}-${monthNumber}`;
    option.textContent = `${monthName} ${currentYear}`;

    summaryMonth.appendChild(option);
  });

  const currentMonth =
    String(currentDate.getMonth() + 1).padStart(2, "0");

  summaryMonth.value =
    `${currentYear}-${currentMonth}`;
}
async function loadMonthlySummary() {
  try {
    const response = await fetch(
      `${API_URL}/summary?month=${summaryMonth.value}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to load monthly summary"
      );
    }

    monthlyTotal.textContent =
      `€${Number(result.totalSpent).toFixed(2)}`;

    monthlyCount.textContent =
      result.numberOfExpenses;

    monthlyAverage.textContent =
      `€${Number(result.averageExpense).toFixed(2)}`;

    monthlyHighest.textContent =
      `€${Number(result.highestExpense).toFixed(2)}`;

    if (result.byCategory.length === 0) {
      categorySummary.innerHTML = `
        <div class="empty-summary">
          No expenses for this month.
        </div>
      `;

      return;
    }

    categorySummary.innerHTML = result.byCategory.map(item => `
      <div class="category-row">
        <div class="category-name">
          <span class="category-dot"></span>
          ${escapeHtml(item.category)}
        </div>

        <strong>
          €${Number(item.total).toFixed(2)}
        </strong>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);

    monthlyTotal.textContent = "€0.00";
    monthlyCount.textContent = "0";
    monthlyAverage.textContent = "€0.00";
    monthlyHighest.textContent = "€0.00";

    categorySummary.innerHTML = `
      <div class="empty-summary">
        Could not load monthly summary.
      </div>
    `;
  }
}

async function addExpense(data) {
  try {
    showSpinner();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to add expense"
      );
    }

    showAlert(
      "Expense added successfully.",
      "success"
    );

    return true;
  } catch (error) {
    console.error(error);
    showAlert(error.message);
    return false;
  } finally {
    hideSpinner();
  }
}

async function updateExpense(id, data) {
  try {
    showSpinner();

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to update expense"
      );
    }

    showAlert(
      "Expense updated successfully.",
      "success"
    );

    return true;
  } catch (error) {
    console.error(error);
    showAlert(error.message);
    return false;
  } finally {
    hideSpinner();
  }
}

async function deleteExpense(id) {
  try {
    showSpinner();

    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to delete expense"
      );
    }

    showAlert(
      "Expense deleted successfully.",
      "success"
    );

    return true;
  } catch (error) {
    console.error(error);
    showAlert(error.message);
    return false;
  } finally {
    hideSpinner();
  }
}

async function refresh() {
  expenses = await getExpenses();

  renderSummary(expenses);
  applyFilter();
  await loadMonthlySummary();
}

function renderSummary(list) {
  const total = list.reduce((sum, expense) => {
    return sum + Number(expense.amount);
  }, 0);

  const highest = list.length > 0
    ? Math.max(
        ...list.map(expense => Number(expense.amount))
      )
    : 0;

  totalAmount.textContent =
    `€${total.toFixed(2)}`;

  expenseCount.textContent =
    list.length;

  highestExpense.textContent =
    `€${highest.toFixed(2)}`;
}

function renderTable(list) {
  expenseTableBody.innerHTML = "";

  if (list.length === 0) {
    expenseTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          No expenses found.
        </td>
      </tr>
    `;

    return;
  }

  list.forEach(expense => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        ${escapeHtml(expense.title)}
      </td>

      <td>
        €${Number(expense.amount).toFixed(2)}
      </td>

      <td>
        <span class="badge bg-secondary">
          ${escapeHtml(expense.category)}
        </span>
      </td>

      <td>
        ${escapeHtml(expense.date)}
      </td>

      <td>
        <button
          class="btn btn-sm btn-warning me-1 edit-btn"
          data-id="${expense.id}"
        >
          Edit
        </button>

        <button
          class="btn btn-sm btn-danger delete-btn"
          data-id="${expense.id}"
        >
          Delete
        </button>
      </td>
    `;

    expenseTableBody.appendChild(row);
  });
}

function applyFilter() {
  const selectedCategory = categoryFilter.value;

  if (selectedCategory === "All") {
    renderTable(expenses);
    return;
  }

  const filteredExpenses = expenses.filter(expense => {
    return expense.category === selectedCategory;
  });

  renderTable(filteredExpenses);
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}

function validateExpense(data) {
  if (!data.title.trim()) {
    showAlert("Title is required.");
    return false;
  }

  if (!data.amount || Number(data.amount) <= 0) {
    showAlert("Amount must be greater than 0.");
    return false;
  }

  if (!data.category) {
    showAlert("Category is required.");
    return false;
  }

  if (!data.date) {
    showAlert("Date is required.");
    return false;
  }

  return true;
}

function openEditModal(expense) {
  const existingModal =
    document.getElementById("editExpenseModal");

  if (existingModal) {
    existingModal.remove();
  }

  const modalHtml = `
    <div
      class="modal fade"
      id="editExpenseModal"
      tabindex="-1"
    >
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">
              Edit Expense
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div class="modal-body">

            <form id="editExpenseForm">

              <div class="mb-3">
                <label
                  for="editTitle"
                  class="form-label"
                >
                  Title
                </label>

                <input
                  type="text"
                  id="editTitle"
                  class="form-control"
                  value="${escapeHtml(expense.title)}"
                >
              </div>

              <div class="mb-3">
                <label
                  for="editAmount"
                  class="form-label"
                >
                  Amount
                </label>

                <input
                  type="number"
                  id="editAmount"
                  class="form-control"
                  step="0.01"
                  value="${Number(expense.amount)}"
                >
              </div>

              <div class="mb-3">
                <label
                  for="editCategory"
                  class="form-label"
                >
                  Category
                </label>

                <select
                  id="editCategory"
                  class="form-select"
                >
                  <option value="Food">
                    Food
                  </option>

                  <option value="Transport">
                    Transport
                  </option>

                  <option value="Bills">
                    Bills
                  </option>

                  <option value="Entertainment">
                    Entertainment
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label
                  for="editDate"
                  class="form-label"
                >
                  Date
                </label>

                <input
                  type="date"
                  id="editDate"
                  class="form-control"
                  value="${escapeHtml(expense.date)}"
                >
              </div>

            </form>

          </div>

          <div class="modal-footer">

            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Cancel
            </button>

            <button
              type="button"
              class="btn btn-primary"
              id="saveEditButton"
            >
              Save Changes
            </button>

          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML(
    "beforeend",
    modalHtml
  );

  const editCategory =
    document.getElementById("editCategory");

  editCategory.value = expense.category;

  const modalElement =
    document.getElementById("editExpenseModal");

  const modal =
    new bootstrap.Modal(modalElement);

  document
    .getElementById("saveEditButton")
    .addEventListener("click", async () => {

      const data = {
        title:
          document.getElementById("editTitle").value,

        amount:
          document.getElementById("editAmount").value,

        category:
          document.getElementById("editCategory").value,

        date:
          document.getElementById("editDate").value
      };

      if (!validateExpense(data)) {
        return;
      }

      const success =
        await updateExpense(expense.id, data);

      if (success) {
        modal.hide();
        await refresh();
      }
    });

  modalElement.addEventListener(
    "hidden.bs.modal",
    () => {
      modalElement.remove();
    }
  );

  modal.show();
}

expenseForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const data = {
      title:
        document.getElementById("title").value,

      amount:
        document.getElementById("amount").value,

      category:
        document.getElementById("category").value,

      date:
        document.getElementById("date").value
    };

    if (!validateExpense(data)) {
      return;
    }

    const success =
      await addExpense(data);

    if (success) {
      expenseForm.reset();
      await refresh();
    }
  }
);

categoryFilter.addEventListener(
  "change",
  applyFilter
);

summaryMonth.addEventListener(
  "change",
  loadMonthlySummary
);

expenseTableBody.addEventListener(
  "click",
  async event => {

    const editButton =
      event.target.closest(".edit-btn");

    const deleteButton =
      event.target.closest(".delete-btn");

    if (editButton) {
      const id =
        Number(editButton.dataset.id);

      const expense =
        expenses.find(item => item.id === id);

      if (expense) {
        openEditModal(expense);
      }
    }

    if (deleteButton) {
      const id =
        Number(deleteButton.dataset.id);

      const confirmed =
        confirm(
          "Are you sure you want to delete this expense?"
        );

      if (!confirmed) {
        return;
      }

      const success =
        await deleteExpense(id);

      if (success) {
        await refresh();
      }
    }
  }
);

populateMonthSelector();
refresh();