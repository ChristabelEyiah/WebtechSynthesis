
"use strict";

// ---------- SELECT HTML ELEMENTS ----------
const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const subjectInput = document.getElementById("task-subject");
const dateInput = document.getElementById("task-date");
const priorityInput = document.getElementById("task-priority");
const taskList = document.getElementById("task-list");
const taskFilter = document.getElementById("task-filter");
const formMessage = document.getElementById("form-message");

const totalTasks = document.getElementById("total-tasks");
const pendingTasks = document.getElementById("pending-tasks");
const completedTasks = document.getElementById("completed-tasks");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");
const taskCount = document.getElementById("task-count");

// ---------- LOAD SAVED TASKS ----------
let tasks = [];

try {
    const savedTasks = localStorage.getItem("studymate-tasks");
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];

    if (Array.isArray(parsedTasks)) {
        tasks = parsedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.subject === "string" &&
            typeof task.dueDate === "string" &&
            ["low", "medium", "high"].includes(task.priority) &&
            typeof task.completed === "boolean"
        );
    }
} catch (error) {
    console.error("Could not load saved tasks:", error);
}

// ---------- HELPER FUNCTIONS ----------
function saveTasks() {
    try {
        localStorage.setItem("studymate-tasks", JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
        showMessage("Unable to save changes in this browser.", true);
    }
}

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("error", isError);
}

function isOverdue(task) {
    return !task.completed && task.dueDate < getToday();
}

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Create an element safely using textContent.
function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// ---------- ADD A TASK ----------
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const subject = subjectInput.value.trim();
    const dueDate = dateInput.value;
    const priority = priorityInput.value;

    if (!title || !subject || !dueDate) {
        showMessage("Please complete all required fields.", true);
        return;
    }

    if (dueDate < getToday()) {
        showMessage("Please choose today or a future due date.", true);
        return;
    }

    const newTask = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: title,
        subject: subject,
        dueDate: dueDate,
        priority: priority,
        completed: false
    };

    tasks.push(newTask);
    saveTasks();

    taskForm.reset();
    priorityInput.value = "medium";
    showMessage("Task added successfully!");

    renderTasks();
});

// ---------- DISPLAY TASKS ----------
function renderTasks() {
    taskList.replaceChildren();

    const filter = taskFilter.value;

    let visibleTasks = tasks.filter(task => {
        if (filter === "pending") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
    });

    // Show unfinished and nearest deadlines first.
    visibleTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed);
        }

        return a.dueDate.localeCompare(b.dueDate);
    });

    if (visibleTasks.length === 0) {
        let message = "No tasks yet. Add your first task!";

        if (filter === "pending") {
            message = "You have no pending tasks.";
        } else if (filter === "completed") {
            message = "No completed tasks yet.";
        }

        taskList.appendChild(createElement("p", "empty-state", message));
    }

    visibleTasks.forEach(task => {
        const item = createElement(
            "article",
            `task-item${task.completed ? " is-completed" : ""}`
        );

        const main = createElement("div", "task-main");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.title} as ${task.completed ? "pending" : "completed"}`
        );

        checkbox.addEventListener("change", function () {
            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        const details = createElement("div", "task-details");
        const title = createElement("h3", "task-title", task.title);
        const meta = createElement(
            "p",
            "task-meta",
            `${task.subject} • Due ${formatDate(task.dueDate)}`
        );

        const badges = createElement("div", "task-badges");
        const priorityBadge = createElement(
            "span",
            `badge priority-${task.priority}`,
            `${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)} priority`
        );

        badges.appendChild(priorityBadge);

        if (task.completed) {
            badges.appendChild(
                createElement("span", "badge completed-badge", "Completed")
            );
        } else if (isOverdue(task)) {
            badges.appendChild(
                createElement("span", "badge overdue-badge", "Overdue")
            );
        }

        details.append(title, meta, badges);
        main.append(checkbox, details);

        const deleteButton = createElement("button", "delete-button", "Delete");
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        deleteButton.addEventListener("click", function () {
            const confirmed = window.confirm(
                `Are you sure you want to delete "${task.title}"?`
            );

            if (!confirmed) return;

            tasks = tasks.filter(item => item.id !== task.id);
            saveTasks();
            renderTasks();
        });

        item.append(main, deleteButton);
        taskList.appendChild(item);
    });

    updateDashboard();
}

// ---------- UPDATE DASHBOARD ----------
function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasks.textContent = total;
    pendingTasks.textContent = pending;
    completedTasks.textContent = completed;

    progressText.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;

    progressTrack.setAttribute("aria-valuenow", percentage);
    taskCount.textContent = `${total} ${total === 1 ? "task" : "tasks"}`;
}

// ---------- FILTER TASKS ----------
taskFilter.addEventListener("change", renderTasks);

// ---------- FOOTER YEAR ----------
document.getElementById("current-year").textContent =
    new Date().getFullYear();

// ---------- INITIAL DISPLAY ----------
dateInput.min = getToday();
renderTasks();