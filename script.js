// script.js
(function(){
  const datePicker = document.getElementById("datePicker");
  const slotsDiv = document.getElementById("slots");
  const form = document.getElementById("bookingForm");
  const formDate = document.getElementById("formDate");
  const formTime = document.getElementById("formTime");
  const slotIdInput = document.getElementById("slotId");
  const msg = document.getElementById("msg");

  // default date = today
  const today = new Date();
  datePicker.valueAsDate = today;
  loadSlotsFor(datePicker.value);

  datePicker.addEventListener("change", () => {
    loadSlotsFor(datePicker.value);
  });

  let selectedSlot = null;

  async function loadSlotsFor(isoDate){
    slotsDiv.innerHTML = "Memuatkan...";
    try {
      // request availability to GAS
      const res = await fetch(GAS_URL + "?action=availability&date=" + isoDate);
      const json = await res.json();
      const booked = json.booked || [];
      renderSlots(isoDate, booked);
    } catch(e){
      slotsDiv.innerHTML = "Gagal muat turun slot.";
      console.error(e);
    }
  }

  function renderSlots(dateStr, booked){
    slotsDiv.innerHTML = "";
    selectedSlot = null;
    formDate.value = dateStr;
    formTime.value = "";
    slotIdInput.value = "";

    // operating hours 14:00 to 23:30 (30-min slots)
    const slots = [];
    const pad = (n)=> n.toString().padStart(2,"0");
    let start = new Date(dateStr + "T14:00:00");
    const end = new Date(dateStr + "T23:30:00");
    while(start <= end){
      const h = start.getHours();
      const m = start.getMinutes();
      const label = pad(h) + ":" + pad(m);
      // slotId can be date + '_' + label
      const slotId = dateStr + "_" + label;
      slots.push({label, slotId});
      start = new Date(start.getTime() + 30*60*1000);
    }

    for(const s of slots){
      const el = document.createElement("div");
      el.className = "slot";
      el.textContent = s.label;
      if(booked.indexOf(s.slotId) !== -1){
        el.classList.add("taken");
        el.title = "Sudah ditempah";
      } else {
        el.classList.add("available");
        el.addEventListener("click", ()=> {
          // deselect previous
          const prev = document.querySelector(".slot.selected");
          if(prev) prev.classList.remove("selected");
          el.classList.add("selected");
          selectedSlot = s;
          formTime.value = s.label;
          slotIdInput.value = s.slotId;
          msg.textContent = "Slot dipilih: " + s.label;
        });
      }
      slotsDiv.appendChild(el);
    }
  }

  form.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    if(!slotIdInput.value){
      msg.textContent = "Sila pilih slot terlebih dahulu.";
      return;
    }
    const data = {
      name: form.name.value.trim(),
      matrik: form.matrik.value.trim(),
      phone: form.phone.value.trim(),
      date: formDate.value,
      time: formTime.value,
      slotId: slotIdInput.value
    };
    msg.textContent = "Menghantar tempahan...";
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if(json.status === "ok"){
        msg.textContent = "Tempahan berjaya! Kami telah menghantar notifikasi.";
        // refresh slots
        loadSlotsFor(formDate.value);
        form.reset();
        datePicker.value = formDate.value;
      } else if(json.error === "slot_taken"){
        msg.textContent = "Maaf, slot telah diambil. Sila pilih slot lain.";
        loadSlotsFor(formDate.value);
      } else {
        msg.textContent = "Ralat: " + (json.error || "tidak diketahui");
      }
    } catch(err){
      msg.textContent = "Gagal menghantar. Sila cuba semula.";
      console.error(err);
    }
  });

})();
