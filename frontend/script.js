const API_URL = 'http://localhost:5000/api';

// --- 1. GATEKEEPER: CHECK LOGIN STATUS ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    loadSlots(); // Load slots if on the booking page
    
    // Auto-fill the patient name if logged in
    const savedName = localStorage.getItem('patientName');
    const nameInput = document.getElementById('patient-name');
    if (savedName && nameInput) {
        nameInput.value = savedName;
    }
});

// --- 2. THE BOOKING LOGIC (WITH SECURITY CHECK) ---
async function handleBooking(event) {
    event.preventDefault();

    // 🔒 SECURITY CHECK: IS USER LOGGED IN?
    const currentUser = localStorage.getItem('username');
    if (!currentUser) {
        alert("🔒 You must Login or Register to book an appointment!");
        openAuthModal(); // Force open the login window
        return; // STOP HERE. Do not proceed.
    }

    // If logged in, proceed with booking...
    const name = document.getElementById('patient-name').value;
    const age = document.querySelector('input[placeholder="30"]').value;
    const gender = document.querySelector('select').value;
    const phone = document.querySelector('input[type="tel"]').value;
    const doctor = document.getElementById('doctor-select').value;
    const date = document.getElementById('appointment-date').value;
    const activeSlot = document.querySelector('.slot-btn.active');

    if (!name || !age || !phone || !doctor || !date || !activeSlot) {
        alert("Please fill all fields and select a time slot.");
        return;
    }

    const slotId = parseInt(activeSlot.dataset.id);
    const msg = document.getElementById('status-message');

    try {
        const res = await fetch(`${API_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slotId, name, age, gender, phone, doctor, date })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert(`✅ Success! Appointment booked for ${name}.`);
            loadSlots(); // Refresh slots
            // We do NOT clear the login, so they can book again!
        } else {
            msg.innerText = `❌ ${data.message}`;
        }
    } catch (err) {
        msg.innerText = "❌ Error connecting to server";
    }
}

// --- 3. LOAD SLOTS (UNCHANGED) ---
async function loadSlots() {
    const dateInput = document.getElementById('appointment-date');
    const container = document.getElementById('slots-container');
    if(!dateInput || !container) return; // Skip if not on booking page

    const date = dateInput.value;
    container.innerHTML = '<p class="text-gray-400 col-span-3 text-center">Loading...</p>';

    try {
        const res = await fetch(`${API_URL}/slots?date=${date}`);
        const slots = await res.json();
        
        container.innerHTML = ''; // Clear loading message

        slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button'; // Prevent form submit
            btn.className = `slot-btn w-full py-3 rounded-lg border font-medium transition-all ${
                slot.isBooked 
                ? 'bg-red-900/20 border-red-900 text-red-500 cursor-not-allowed opacity-50' 
                : 'bg-input-dark border-border-dark text-white hover:border-primary hover:text-primary'
            }`;
            btn.innerText = slot.time;
            btn.dataset.id = slot.id;
            
            if (slot.isBooked) {
                btn.disabled = true;
                btn.innerText += ' (Full)';
            } else {
                btn.onclick = () => {
                    document.querySelectorAll('.slot-btn').forEach(b => {
                        b.classList.remove('active', 'bg-primary', 'text-white', 'border-primary');
                        if(!b.disabled) b.classList.add('bg-input-dark', 'border-border-dark');
                    });
                    btn.classList.remove('bg-input-dark', 'border-border-dark');
                    btn.classList.add('active', 'bg-primary', 'text-white', 'border-primary');
                };
            }
            container.appendChild(btn);
        });
    } catch (err) {
        console.error(err);
    }
}

// Update slots when date changes
const dateInput = document.getElementById('appointment-date');
if(dateInput) {
    dateInput.addEventListener('change', loadSlots);
    // Set today's date by default
    dateInput.valueAsDate = new Date();
}

// --- 4. AUTHENTICATION LOGIC (LOGIN / REGISTER) ---
let isRegisterMode = false;

function openAuthModal() {
    const user = localStorage.getItem('username');
    if (user) {
        // If already logged in, this button acts as LOGOUT
        if(confirm(`Logged in as ${user}. Do you want to logout?`)) {
            localStorage.removeItem('username');
            localStorage.removeItem('patientName');
            location.reload(); // Refresh to lock the booking again
        }
    } else {
        // If not logged in, open the window
        isRegisterMode = false;
        updateAuthUI();
        document.getElementById('authModal').showModal();
    }
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    updateAuthUI();
}

function updateAuthUI() {
    const title = document.getElementById('modal-title');
    const toggleText = document.getElementById('toggle-text');
    const registerFields = document.getElementById('register-fields');
    const usernameInput = document.getElementById('auth-username');

    if (isRegisterMode) {
        title.innerText = "Register";
        toggleText.innerText = "Have an account? Login";
        registerFields.classList.remove('hidden'); 
        usernameInput.placeholder = "Username";
    } else {
        title.innerText = "Login";
        toggleText.innerText = "Need an account? Register";
        registerFields.classList.add('hidden'); 
        usernameInput.placeholder = "Username or Email";
    }
}

async function handleAuth() {
    const usernameIn = document.getElementById('auth-username').value;
    const passwordIn = document.getElementById('auth-password').value;
    const emailIn = document.getElementById('auth-email').value;
    const phoneIn = document.getElementById('auth-phone').value;
    const msg = document.getElementById('auth-msg');
    
    if (!usernameIn || !passwordIn) {
        msg.innerText = "Username and Password are required";
        return;
    }

    const endpoint = isRegisterMode ? '/register' : '/login';
    const payload = { username: usernameIn, password: passwordIn };
    
    if (isRegisterMode) {
        payload.email = emailIn;
        payload.phone = phoneIn;
    }
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            if (isRegisterMode) {
                alert("Registration Successful! Please Login now.");
                toggleAuthMode();
            } else {
                // LOGIN SUCCESS
                localStorage.setItem('username', data.username);
                localStorage.setItem('patientName', data.username);
                document.getElementById('authModal').close();
                checkLoginStatus();
                
                // Auto-fill name after login
                const nameInput = document.getElementById('patient-name');
                if(nameInput) nameInput.value = data.username;
            }
        } else {
            msg.innerText = data.message;
        }
    } catch (err) {
        msg.innerText = "Server Error";
    }
}

function checkLoginStatus() {
    const user = localStorage.getItem('username');
    const btn = document.getElementById('auth-btn');

    if (user && btn) {
        btn.innerText = `Logout (${user})`;
        btn.classList.replace('bg-input-dark', 'bg-red-900/30');
        btn.classList.replace('text-gray-300', 'text-red-400');
        btn.classList.add('border-red-900');
    } else if (btn) {
        btn.innerText = "Login / Register";
        btn.classList.remove('bg-red-900/30', 'text-red-400', 'border-red-900');
        btn.classList.add('bg-input-dark', 'text-gray-300');
    }
}

// --- 5. VIEW BOOKINGS (HISTORY) ---
async function openBookingModal() {
    // SECURITY CHECK HERE TOO
    const user = localStorage.getItem('username');
    if (!user) {
        alert("🔒 Please Login to view your bookings.");
        openAuthModal();
        return;
    }

    document.getElementById('bookingsModal').showModal();
    const list = document.getElementById('my-bookings-list');
    list.innerHTML = '<p class="text-gray-500 text-center">Loading...</p>';

    try {
        // We use the logged-in username to fetch ONLY their data
        const res = await fetch(`${API_URL}/my-bookings?name=${user}`);
        const bookings = await res.json();

        list.innerHTML = '';
        if (bookings.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-center">No bookings found.</p>';
        } else {
            bookings.forEach(b => {
                const item = document.createElement('div');
                item.className = 'bg-input-dark p-3 rounded-lg border border-border-dark flex justify-between items-center';
                item.innerHTML = `
                    <div>
                        <p class="font-bold text-primary">${b.time}</p>
                        <p class="text-xs text-gray-400">${new Date(b.bookedDate).toDateString()}</p>
                        <p class="text-sm text-white">${b.doctorName}</p>
                    </div>
                    <span class="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900">Confirmed</span>
                `;
                list.appendChild(item);
            });
        }
    } catch (err) {
        list.innerHTML = '<p class="text-red-500 text-center">Error loading history</p>';
    }
}