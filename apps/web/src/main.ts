import { mount } from "svelte";
import App from "./App.svelte";
import "./app.css";
import { loadScript } from "./lib/storage";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app");

target.textContent = "載入中 · Loading…";
void loadScript().then(
  (initialScript) => {
    target.replaceChildren();
    mount(App, { target, props: { initialScript } });
  },
  () => {
    target.textContent =
      "無法讀取進度，請重新開啟。· Could not load your save. Please reopen the app.";
  },
);
