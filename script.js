const btn = document.getElementById("clickBtn");
const msg = document.getElementById("message");

btn.addEventListener("click", () => {
  msg.classList.add("show");
  msg.textContent = "🎉 You clicked the button at " + new Date().toLocaleTimeString() + " 🎉";

  // Small bounce animation
  btn.style.transform = "scale(1.2)";
  setTimeout(() => btn.style.transform = "scale(1)", 200);
});