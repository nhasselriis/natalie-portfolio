const messageButton = document.getElementById("messageButton");
const message = document.getElementById("message");
const titleInput = document.getElementById("titleInput");
const pageTitle = document.getElementById("pageTitle");
const taskInput = document.getElementById("taskInput");
const addTaskButton = document.getElementById("addTaskButton");
const taskList = document.getElementById("taskList");

messageButton.addEventListener("click", function () {
  message.textContent = "The page content changed with JavaScript!";
});

titleInput.addEventListener("input", function () {
  if (titleInput.value.trim() !== "") {
    pageTitle.classList.add("active-title");
  } else {
    pageTitle.classList.remove("active-title");
  }
});

function addTask() {
  const taskText = taskInput.value.trim();

  if (taskText === "") {
    return;
  }

  const newTask = document.createElement("li");
  newTask.textContent = taskText;

  newTask.addEventListener("click", function () {
    newTask.remove();
  });

  taskList.appendChild(newTask);
  taskInput.value = "";
  taskInput.focus();
}

addTaskButton.addEventListener("click", addTask);

taskInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addTask();
  }
});
