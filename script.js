let deadlines = [];
let calendarDate = new Date();

const STORAGE_KEY = "deadlineBuddyDeadlines";

function loadDeadlines() {
    let savedDeadlines = localStorage.getItem(STORAGE_KEY);

    if (!savedDeadlines) {
        const userType = localStorage.getItem("userType") || "other";
        const oldKey = "deadlines_" + userType;
        const oldDeadlines = localStorage.getItem(oldKey);

        if (oldDeadlines) {
            savedDeadlines = oldDeadlines;
            localStorage.setItem(STORAGE_KEY, oldDeadlines);
        }
    }

    deadlines = savedDeadlines ? JSON.parse(savedDeadlines) : [];
}

function saveDeadlines() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("This browser does not support notifications.");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission === "denied") {
        alert("Notifications are blocked. Please allow them in Chrome settings.");
        return false;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
        alert("Please allow notifications to receive reminders.");
        return false;
    }

    return true;
}

function getReminderDays(reminder) {
    if (reminder === "1week") return 7;
    if (reminder === "2days") return 2;
    if (reminder === "1day") return 1;
    if (reminder === "due") return 0;
    return null;
}

function getReminderDate(deadline) {
    const reminderDays = getReminderDays(deadline.reminder);

    if (reminderDays === null) return null;

    const dueDate = new Date(deadline.date + "T00:00:00");
    dueDate.setDate(dueDate.getDate() - reminderDays);

    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, "0");
    const day = String(dueDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayDateString() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function sendReminderNotifications() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const today = getTodayDateString();

    deadlines.forEach(deadline => {
        if (
            deadline.completed ||
            !deadline.reminder ||
            deadline.reminder === "none"
        ) {
            return;
        }

        const reminderDate = getReminderDate(deadline);

        if (!reminderDate || reminderDate !== today) return;

        const sentKey = `deadlineReminderSent_${deadline.id}_${reminderDate}`;

        if (localStorage.getItem(sentKey) === "yes") return;

        let reminderText = "Your deadline is coming up!";

        if (deadline.reminder === "due") {
            reminderText = "Your deadline is due today.";
        } else if (deadline.reminder === "1day") {
            reminderText = "Your deadline is due tomorrow.";
        } else if (deadline.reminder === "2days") {
            reminderText = "Your deadline is due in 2 days.";
        } else if (deadline.reminder === "1week") {
            reminderText = "Your deadline is due in 1 week.";
        }

        new Notification("🌷 Deadline Buddy Reminder", {
            body: `${deadline.task}\n${reminderText}`,
            tag: `deadline-${deadline.id}`
        });

        localStorage.setItem(sentKey, "yes");
    });
}

function startReminderChecker() {
    sendReminderNotifications();
    setInterval(sendReminderNotifications, 60 * 1000);
}

function getCurrentUserType() {
    return localStorage.getItem("userType") || "other";
}

function formatText(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function addDeadline() {
    requestNotificationPermission();
    loadDeadlines();

    const subjectInput = document.getElementById("subject");
    const taskInput = document.getElementById("task");
    const dateInput = document.getElementById("date");
    const priorityInput = document.getElementById("priority");
    const reminderInput = document.getElementById("reminder");

    if (
        !subjectInput ||
        !taskInput ||
        !dateInput ||
        !priorityInput ||
        !reminderInput
    ) {
        return;
    }

    const subject = formatText(subjectInput.value);
    const task = formatText(taskInput.value);
    const date = dateInput.value;
    const priority = priorityInput.value;
    const reminder = reminderInput.value;

    if (subject === "" || task === "" || date === "") {
        alert("Please fill all the fields.");
        return;
    }

    const deadline = {
        id: Date.now(),
        subject: subject,
        task: task,
        date: date,
        priority: priority,
        reminder: reminder,
        completed: false
    };

    deadlines.push(deadline);
    saveDeadlines();

    subjectInput.value = "";
    taskInput.value = "";
    dateInput.value = "";
    reminderInput.value = "none";

    window.location.href = "deadline.html";
}

function displayDeadlines() {
    const deadlineList = document.getElementById("deadlineList");

    if (!deadlineList) return;

    deadlineList.innerHTML = "";

    const currentUserType = getCurrentUserType();

    let categoryName = "Category";

    if (
        currentUserType === "school" ||
        currentUserType === "college"
    ) {
        categoryName = "Subject";
    }

    if (deadlines.length === 0) {
        deadlineList.innerHTML =
            `<p class="no-results">🌷 No deadlines found.</p>`;
        return;
    }

    deadlines.forEach(deadline => {
        const card = document.createElement("div");

        card.className = "deadline-card";

        card.innerHTML = `
            <h3>${deadline.task}</h3>

            <p>📚 ${categoryName}: ${deadline.subject}</p>

            <p>📅 Due: ${deadline.date}</p>

            <p class="priority-badge priority-${deadline.priority.toLowerCase()}">
                ⭐ ${deadline.priority} Priority
            </p>

            <p class="countdown-badge ${getUrgencyClass(deadline.date)}">
                ⏳ ${getDaysRemaining(deadline.date)}
            </p>

            <p>
                ⏰ Reminder:
                ${
                    deadline.reminder === "due"
                        ? "On Due Date"
                        : deadline.reminder === "1day"
                        ? "1 Day Before"
                        : deadline.reminder === "2days"
                        ? "2 Days Before"
                        : deadline.reminder === "1week"
                        ? "1 Week Before"
                        : "No Reminder"
                }
            </p>

            <button onclick="completeDeadline(${deadline.id})">
                ${deadline.completed ? "Completed ✅" : "Mark Completed"}
            </button>

            <button onclick="deleteDeadline(${deadline.id})">
                Delete 🗑️
            </button>

            <button onclick="editDeadline(${deadline.id})">
                ✏️ Edit
            </button>
        `;

        deadlineList.appendChild(card);
    });
}

function completeDeadline(id) {
    const deadline = deadlines.find(item => item.id === id);

    if (!deadline) return;

    deadline.completed = true;

    saveDeadlines();

    displayDeadlines();
    updateDashboard();
    filterDeadlines();
    displayCalendar();
    displayDeadlineCalendar();
}

function deleteDeadline(id) {
    deadlines = deadlines.filter(item => item.id !== id);

    saveDeadlines();

    displayDeadlines();
    updateDashboard();
    filterDeadlines();
    displayCalendar();
    displayDeadlineCalendar();
}

function getDaysRemaining(date) {
    const today = new Date();
    const deadline = new Date(date);

    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const difference = deadline - today;

    const days = Math.ceil(
        difference / (1000 * 60 * 60 * 24)
    );

    if (days < 0) return "🔴 Overdue";
    if (days === 0) return "🔴 Due Today";
    if (days === 1) return "🟠 Due Tomorrow";

    return `🟢 Due in ${days} days`;
}

function updateDashboard() {
    const total = deadlines.length;

    const completed = deadlines.filter(
        deadline => deadline.completed
    ).length;

    const pending = total - completed;

    const overdue = deadlines.filter(
        deadline =>
            !deadline.completed &&
            getDaysRemaining(deadline.date) === "🔴 Overdue"
    ).length;

    let progress = 0;

    if (total > 0) {
        progress = Math.round((completed / total) * 100);
    }

    const totalCount = document.getElementById("totalCount");
    const pendingCount = document.getElementById("pendingCount");
    const completedCount = document.getElementById("completedCount");
    const overdueCount = document.getElementById("overdueCount");
    const progressText = document.getElementById("progressText");
    const progressFill = document.getElementById("progressFill");

    if (totalCount) totalCount.textContent = total;
    if (pendingCount) pendingCount.textContent = pending;
    if (completedCount) completedCount.textContent = completed;
    if (overdueCount) overdueCount.textContent = overdue;

    if (progressText) {
        progressText.textContent = progress + "%";
    }

    if (progressFill) {
        progressFill.style.width = progress + "%";
    }
}

let selectedUserType = localStorage.getItem("userType") || "";

function selectUserType(type, card) {
    selectedUserType = type;

    const cards = document.querySelectorAll(".user-type-card");

    cards.forEach(item => {
        item.classList.remove("selected");
    });

    if (card) {
        card.classList.add("selected");
    }

    const userTypeNames = {
        school: "School Student 🎒",
        college: "College Student 🎓",
        office: "Office / Work 💼",
        personal: "Personal / Home 🏠",
        other: "Other ✨"
    };

    const selectedUserTypeText =
        document.getElementById("selectedUserType");

    if (selectedUserTypeText) {
        selectedUserTypeText.textContent =
            `You selected ${userTypeNames[type]}`;
    }

    const continueButton =
        document.getElementById("continueButton");

    if (continueButton) {
        continueButton.disabled = false;
    }
}

function continueToDashboard() {
    if (selectedUserType === "") {
        alert("Please choose an option first.");
        return;
    }

    localStorage.setItem("userType", selectedUserType);

    window.location.href = "dashboard.html";
}

function updateCategoryFields() {
    const userType = getCurrentUserType();

    const categoryLabel =
        document.getElementById("categoryLabel");

    const subjectInput =
        document.getElementById("subject");

    const taskInput =
        document.getElementById("task");

    if (!categoryLabel || !subjectInput || !taskInput) {
        return;
    }

    if (userType === "school") {
        categoryLabel.textContent = "Subject";
        subjectInput.placeholder =
            "e.g. Maths, English, Science";
        taskInput.placeholder =
            "e.g. Complete Maths homework";

    } else if (userType === "college") {
        categoryLabel.textContent = "Subject";
        subjectInput.placeholder =
            "e.g. Computer Networking, Java";
        taskInput.placeholder =
            "e.g. Submit Java assignment";

    } else if (userType === "office") {
        categoryLabel.textContent = "Category";
        subjectInput.placeholder =
            "e.g. Project, Report, Meeting";
        taskInput.placeholder =
            "e.g. Submit monthly report";

    } else if (userType === "personal") {
        categoryLabel.textContent = "Category";
        subjectInput.placeholder =
            "e.g. Housework, Bills, Shopping";
        taskInput.placeholder =
            "e.g. Clean the kitchen";

    } else {
        categoryLabel.textContent = "Category";
        subjectInput.placeholder =
            "e.g. Anything important";
        taskInput.placeholder =
            "e.g. Complete this task";
    }
}

function updateWelcomeMessage() {
    const userType = getCurrentUserType();

    const heading =
        document.getElementById("welcomeHeading");

    const description =
        document.getElementById("welcomeDescription");

    if (!heading || !description) return;

    if (userType === "school") {
        heading.textContent =
            "Let's get your school work done.";

        description.textContent =
            "Keep track of assignments, exams and projects.";

    } else if (userType === "college") {
        heading.textContent =
            "Let's get your college work done.";

        description.textContent =
            "Keep track of subjects, projects and submissions.";

    } else if (userType === "office") {
        heading.textContent =
            "Let's stay on top of work.";

        description.textContent =
            "Keep track of projects, reports and meetings.";

    } else if (userType === "personal") {
        heading.textContent =
            "Let's get things organized.";

        description.textContent =
            "Keep track of housework, bills and important tasks.";

    } else {
        heading.textContent =
            "Let's stay on track.";

        description.textContent =
            "Keep track of anything important to you.";
    }
}

function filterDeadlines() {
    const searchInput =
        document.getElementById("searchDeadline");

    const statusInput =
        document.getElementById("statusFilter");

    const priorityInput =
        document.getElementById("priorityFilter");

    if (!searchInput || !statusInput || !priorityInput) {
        return;
    }

    const searchText =
        searchInput.value.toLowerCase();

    const status = statusInput.value;
    const priority = priorityInput.value;

    const filteredDeadlines = deadlines.filter(deadline => {

        const matchesSearch =
            deadline.task.toLowerCase().includes(searchText) ||
            deadline.subject.toLowerCase().includes(searchText);

        const matchesStatus =
            status === "all" ||
            (status === "pending" && !deadline.completed) ||
            (status === "completed" && deadline.completed);

        const matchesPriority =
            priority === "all" ||
            deadline.priority === priority;

        return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
        );
    });

    displayFilteredDeadlines(filteredDeadlines);
}

function displayFilteredDeadlines(filteredDeadlines) {
    const deadlineList =
        document.getElementById("deadlineList");

    if (!deadlineList) return;

    deadlineList.innerHTML = "";

    if (filteredDeadlines.length === 0) {
        deadlineList.innerHTML =
            `<p class="no-results">🌷 No deadlines match your search.</p>`;
        return;
    }

    const userType = getCurrentUserType();

    const categoryName =
        userType === "school" ||
        userType === "college"
            ? "Subject"
            : "Category";

    filteredDeadlines.forEach(deadline => {

        const card = document.createElement("div");

        card.className = "deadline-card";

        card.innerHTML = `
            <h3>${deadline.task}</h3>

            <p>📚 ${categoryName}: ${deadline.subject}</p>

            <p>📅 Due: ${deadline.date}</p>

            <p class="priority-badge priority-${deadline.priority.toLowerCase()}">
                ⭐ ${deadline.priority} Priority
            </p>

            <p class="countdown-badge ${getUrgencyClass(deadline.date)}">
                ⏳ ${getDaysRemaining(deadline.date)}
            </p>

            <p>
                ⏰ Reminder:
                ${
                    deadline.reminder === "due"
                        ? "On Due Date"
                        : deadline.reminder === "1day"
                        ? "1 Day Before"
                        : deadline.reminder === "2days"
                        ? "2 Days Before"
                        : deadline.reminder === "1week"
                        ? "1 Week Before"
                        : "No Reminder"
                }
            </p>

            <button onclick="completeDeadline(${deadline.id})">
                ${deadline.completed ? "Completed ✅" : "Mark Completed"}
            </button>

            <button onclick="deleteDeadline(${deadline.id})">
                Delete 🗑️
            </button>

            <button onclick="editDeadline(${deadline.id})">
                ✏️ Edit
            </button>
        `;

        deadlineList.appendChild(card);
    });
}

function editDeadline(id) {
    const deadline = deadlines.find(item => item.id === id);

    if (!deadline) return;

    const newSubject =
        prompt(
            "Edit subject/category:",
            deadline.subject
        );

    if (newSubject === null) return;

    const newTask =
        prompt(
            "Edit task:",
            deadline.task
        );

    if (newTask === null) return;

    const newDate =
        prompt(
            "Edit due date (YYYY-MM-DD):",
            deadline.date
        );

    if (newDate === null) return;

    const newPriority =
        prompt(
            "Edit priority (Low / Medium / High):",
            deadline.priority
        );

    if (newPriority === null) return;

    deadline.subject = formatText(newSubject);
    deadline.task = formatText(newTask);
    deadline.date = newDate;
    deadline.priority = formatText(newPriority);

    saveDeadlines();

    displayDeadlines();
    updateDashboard();
    filterDeadlines();
    displayCalendar();
    displayDeadlineCalendar();
}

function displayCalendar() {
    const calendar =
        document.getElementById("calendarDays");

    if (!calendar) return;

    calendar.innerHTML = "";

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay =
        new Date(year, month, 1).getDay();

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const monthTitle =
        document.getElementById("calendarMonth");

    if (monthTitle) {
        monthTitle.textContent =
            calendarDate.toLocaleString(
                "default",
                {
                    month: "long",
                    year: "numeric"
                }
            );
    }

    for (let i = 0; i < firstDay; i++) {
        const empty =
            document.createElement("div");

        empty.className =
            "calendar-day empty";

        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {

        const dayElement =
            document.createElement("div");

        dayElement.className =
            "calendar-day";

        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const today = new Date();

        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dayElement.classList.add("today");
        }

        const number =
            document.createElement("button");

        number.className =
            "calendar-date-number";

        number.textContent = day;

        number.type = "button";

        number.title =
            "Click to view deadlines for this date";

        number.onclick = function(event) {
            event.stopPropagation();
            showDateDeadlines(dateString);
        };

        dayElement.appendChild(number);

        const dayDeadlines =
            deadlines.filter(
                deadline =>
                    deadline.date === dateString
            );

        dayDeadlines.forEach(deadline => {

            const deadlineItem =
                document.createElement("div");

            deadlineItem.className =
                "calendar-deadline";

            if (deadline.completed) {
                deadlineItem.classList.add("completed");
            }

            deadlineItem.textContent =
                deadline.task;

            deadlineItem.title =
                "Click to view deadline details";

            deadlineItem.onclick =
                function(event) {
                    event.stopPropagation();
                    showCalendarDeadlineDetails(
                        deadline.id
                    );
                };

            dayElement.appendChild(deadlineItem);
        });

        calendar.appendChild(dayElement);
    }
}

function previousDeadlineMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);

    displayDeadlineCalendar();
}

function nextDeadlineMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);

    displayDeadlineCalendar();
}
function previousMonth() {
    calendarDate.setMonth(
        calendarDate.getMonth() - 1
    );

    displayCalendar();
    displayDeadlineCalendar();
}

function nextMonth() {
    calendarDate.setMonth(
        calendarDate.getMonth() + 1
    );

    displayCalendar();
    displayDeadlineCalendar();
}

function getUrgencyClass(date) {
    const today = new Date();
    const deadline = new Date(date);

    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const difference =
        deadline - today;

    const days =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );

    if (days < 0) return "urgency-overdue";
    if (days === 0) return "urgency-today";
    if (days === 1) return "urgency-tomorrow";
    if (days <= 3) return "urgency-soon";

    return "urgency-normal";
}

function showListView() {
    const listView =
        document.getElementById("deadlineListView") ||
        document.getElementById("deadlineList");

    const calendarView =
        document.getElementById("deadlineCalendarView");

    const listButton =
        document.getElementById("listViewButton");

    const calendarButton =
        document.getElementById("calendarViewButton");

    if (listView) {
        listView.style.display = "block";
    }

    if (calendarView) {
        calendarView.style.display = "none";
    }

    if (listButton) {
        listButton.classList.add("active");
    }

    if (calendarButton) {
        calendarButton.classList.remove("active");
    }
}

function showCalendarView() {
    const listView =
        document.getElementById("deadlineListView") ||
        document.getElementById("deadlineList");

    const calendarView =
        document.getElementById("deadlineCalendarView");

    const listButton =
        document.getElementById("listViewButton");

    const calendarButton =
        document.getElementById("calendarViewButton");

    if (listView) {
        listView.style.display = "none";
    }

    if (calendarView) {
        calendarView.style.display = "block";
    }

    if (listButton) {
        listButton.classList.remove("active");
    }

    if (calendarButton) {
        calendarButton.classList.add("active");
    }

    displayDeadlineCalendar();
}

function showDeadlineListView() {
    showListView();
}

function showDeadlineCalendarView() {
    showCalendarView();
}

function displayDeadlineCalendar() {
    const calendar =
        document.getElementById("deadlineCalendarDays");

    if (!calendar) return;

    calendar.innerHTML = "";

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay =
        new Date(year, month, 1).getDay();

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const title =
        document.getElementById(
            "deadlineCalendarMonth"
        );

    if (title) {
        title.textContent =
            calendarDate.toLocaleString(
                "default",
                {
                    month: "long",
                    year: "numeric"
                }
            );
    }

    for (let i = 0; i < firstDay; i++) {

        const empty =
            document.createElement("div");

        empty.className =
            "calendar-day empty";

        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {

        const dayElement =
            document.createElement("div");

        dayElement.className =
            "calendar-day";

        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const today = new Date();

        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dayElement.classList.add("today");
        }

        const number =
            document.createElement("button");

        number.className =
            "calendar-date-number";

        number.textContent = day;

        number.type = "button";

        number.title =
            "Click to view deadlines for this date";

        number.onclick = function(event) {
            event.stopPropagation();
            showDateDeadlines(dateString);
        };

        dayElement.appendChild(number);

        const dayDeadlines =
            deadlines.filter(
                deadline =>
                    deadline.date === dateString
            );

        dayDeadlines.forEach(deadline => {

            const item =
                document.createElement("div");

            item.className =
                "calendar-deadline";

            if (deadline.completed) {
                item.classList.add("completed");
            }

            item.textContent =
                deadline.task;

            item.title =
                "Click to view deadline details";

            item.onclick =
                function(event) {
                    event.stopPropagation();

                    showCalendarDeadlineDetails(
                        deadline.id
                    );
                };

            dayElement.appendChild(item);
        });

        calendar.appendChild(dayElement);
    }
}

function showDateDeadlines(dateString) {
    const selectedDeadlines =
        deadlines.filter(
            deadline =>
                deadline.date === dateString
        );

    const modal =
        document.getElementById("deadlineModal");

    const details =
        document.getElementById(
            "deadlineModalDetails"
        );

    if (!modal || !details) return;

    const formattedDate =
        new Date(
            dateString + "T00:00:00"
        ).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

    let html = `
        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                📅 Date
            </div>

            <div class="deadline-detail-value">
                ${formattedDate}
            </div>
        </div>
    `;

    if (selectedDeadlines.length === 0) {

        html += `
            <div class="deadline-detail-item">
                <div class="deadline-detail-label">
                    🌷 Deadlines
                </div>

                <div class="deadline-detail-value">
                    No deadlines for this day.
                </div>
            </div>
        `;

    } else {

        selectedDeadlines.forEach(deadline => {

            html += `
                <div class="deadline-detail-item">
                    <div class="deadline-detail-label">
                        📝 Task
                    </div>

                    <div class="deadline-detail-value">
                        ${deadline.task}
                    </div>
                </div>

                <div class="deadline-detail-item">
                    <div class="deadline-detail-label">
                        📚 Subject / Category
                    </div>

                    <div class="deadline-detail-value">
                        ${deadline.subject}
                    </div>
                </div>

                <div class="deadline-detail-item">
                    <div class="deadline-detail-label">
                        ⭐ Priority
                    </div>

                    <div class="deadline-detail-value">
                        ${deadline.priority}
                    </div>
                </div>

                <div class="deadline-detail-item">
                    <div class="deadline-detail-label">
                        ⏳ Status
                    </div>

                    <div class="deadline-detail-value">
                        ${
                            deadline.completed
                                ? "Completed ✅"
                                : getDaysRemaining(
                                      deadline.date
                                  )
                        }
                    </div>
                </div>
            `;
        });
    }

    details.innerHTML = html;

    modal.classList.add("show");
}

function showCalendarDeadlineDetails(id) {
    const deadline =
        deadlines.find(
            item => item.id === id
        );

    if (!deadline) return;

    const modal =
        document.getElementById("deadlineModal");

    const details =
        document.getElementById(
            "deadlineModalDetails"
        );

    if (!modal || !details) return;

    const reminderText =
        deadline.reminder === "due"
            ? "On Due Date"
            : deadline.reminder === "1day"
            ? "1 Day Before"
            : deadline.reminder === "2days"
            ? "2 Days Before"
            : deadline.reminder === "1week"
            ? "1 Week Before"
            : "No Reminder";

    details.innerHTML = `
        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                📚 Subject / Category
            </div>

            <div class="deadline-detail-value">
                ${deadline.subject}
            </div>
        </div>

        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                📝 Task
            </div>

            <div class="deadline-detail-value">
                ${deadline.task}
            </div>
        </div>

        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                📅 Due Date
            </div>

            <div class="deadline-detail-value">
                ${deadline.date}
            </div>
        </div>

        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                ⭐ Priority
            </div>

            <div class="deadline-detail-value">
                ${deadline.priority}
            </div>
        </div>

        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                ⏳ Status
            </div>

            <div class="deadline-detail-value">
                ${
                    deadline.completed
                        ? "Completed ✅"
                        : getDaysRemaining(
                              deadline.date
                          )
                }
            </div>
        </div>

        <div class="deadline-detail-item">
            <div class="deadline-detail-label">
                ⏰ Reminder
            </div>

            <div class="deadline-detail-value">
                ${reminderText}
            </div>
        </div>
    `;

    modal.classList.add("show");
}

function closeDeadlineModal() {
    const modal =
        document.getElementById("deadlineModal");

    if (modal) {
        modal.classList.remove("show");
    }
}

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("deadlineModal");

    if (
        modal &&
        event.target === modal
    ) {
        closeDeadlineModal();
    }
});

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    const themeButton =
        document.getElementById("themeButton");

    if (
        document.body.classList.contains(
            "dark-mode"
        )
    ) {
        if (themeButton) {
            themeButton.textContent = "☀️";
        }

        localStorage.setItem(
            "darkMode",
            "enabled"
        );

    } else {

        if (themeButton) {
            themeButton.textContent = "🌙";
        }

        localStorage.setItem(
            "darkMode",
            "disabled"
        );
    }
}

window.addEventListener(
    "DOMContentLoaded",
    function() {

        loadDeadlines();

        updateCategoryFields();
        updateWelcomeMessage();
        updateDashboard();

        displayDeadlines();
        displayCalendar();
        displayDeadlineCalendar();

        startReminderChecker();

        const themeButton =
            document.getElementById("themeButton");

        const darkMode =
            localStorage.getItem("darkMode");

        if (darkMode === "enabled") {

            document.body.classList.add(
                "dark-mode"
            );

            if (themeButton) {
                themeButton.textContent = "☀️";
            }

        } else {

            if (themeButton) {
                themeButton.textContent = "🌙";
            }
        }

        calendarDate = new Date();

        displayCalendar();
        displayDeadlineCalendar();
    }
);
// Register Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => {
                console.log("Service Worker registered successfully");
            })
            .catch(error => {
                console.log("Service Worker registration failed:", error);
            });
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const testBtn = document.getElementById("testNotificationBtn");

    if (testBtn) {
        testBtn.addEventListener("click", async () => {
            if (!("serviceWorker" in navigator)) {
                alert("Service workers are not supported.");
                return;
            }

            const permission = await Notification.requestPermission();

            if (permission !== "granted") {
                alert("Please allow notifications in Chrome settings.");
                return;
            }

            try {
                const registration = await navigator.serviceWorker.ready;

                await registration.showNotification("🌷 Deadline Buddy", {
                    body: "Success! Notifications are working on your phone!",
                    icon: "./icon-192.png"
                });

                alert("Test notification sent!");
            } catch (error) {
                alert("Notification test failed: " + error.message);
            }
        });
    }
});