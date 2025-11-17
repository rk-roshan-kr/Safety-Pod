# 🚨 SafetyPod – Campus Safety & Smart Walking Pods

A prototype safety system designed for university campuses. SafetyPod allows students to:

* Join or create walking “pods”
* Share live routes
* Trigger SOS alerts to contacts, pod members, and campus security
* Navigate safely inside campus with real-time location and checkpoints

Built for Chandigarh University campus, optimized for hostel users, based on real testing from **100+ users** during prototype evaluation.

---

## 🧭 Features

### 👣 Smart Walking Pods

* Join pods from anywhere on campus
* Create custom pods with:

  * Start location
  * Destination
  * Optional checkpoints
  * Departure time
  * Max members
* Live member count
* Pod info panel with details, ETA, and route
* Leave pod anytime
* Auto-route drawing (green route) for joined users
* Orange helper route guiding users to pod starting point

---

### 🗺️ Interactive Map (Leaflet.js)

* All campus buildings + hostels mapped with custom markers
* Tap any building to set as start/destination
* Dynamic map layers:

  * Blue route → pod planned path
  * Green route → live pod member route
  * Orange dotted route → helper route to pod start

---

### 🆘 SOS System

* Sends alert to:

  * Saved contacts
  * Pod members
  * Campus security
* Auto-calls campus security after 1 second
* SOS alert stored in local storage
* Alerts can be marked:

  * **Safe**
  * **False alert**
* Alerts visible in Alerts panel
* Emergency quick actions:

  * Call security
  * Call police
  * Share location on WhatsApp

---

### 🧑‍🤝‍🧑 Profile & Contacts

* Add emergency contacts (saved locally)
* Remove or edit contacts
* Profile shows login info
* Guest mode supported
* Create account option for new users

---

### 📍 Location Options

* **Automatic GPS** (if permitted)
* **Manual selection**

  * Choose a building
  * Or manually enter coordinates

---

### 🪟 iOS-Style Bottom Drawer

* 3 snap positions:

  * 100% closed
  * 50% open
  * 10% full view
* Smooth drag & snap
* Panels inside drawer:

  * Pods
  * Pod details
  * Alerts
  * Login/Profile

---

## 🧪 Prototype Testing Summary

### 👥 Participants

**100+ students**, ~66% female, majority hostel residents.

### 🔍 Insights Heard

* High acceptance of walking in groups
* Female hostel students preferred pod-feature for night movement
* SOS was triggered during tests → calls received by developers
* Users liked manual + GPS flexibility
* Most felt “somewhat safe” to “neutral,” showing SafetyPod solves a real problem

### 📈 Metrics (Based on 100-user sample)

| Metric                             | Value                        |
| ---------------------------------- | ---------------------------- |
| Female participation               | **66%**                      |
| Hostel residents                   | **~70%**                     |
| Users walking at least weekly      | **60%+**                     |
| Users feeling “somewhat unsafe”    | **25%**                      |
| Users who would use pods           | **85%**                      |
| SOS-triggering users (during test) | **Several (calls verified)** |

*(All charts included in the testing_report.pdf)*

---

## 🛠️ Tech Stack

* **JavaScript / ES6**
* **Leaflet.js** (Map & markers)
* **CSS3** for UI + bottom drawer
* **Firebase Firestore** (state, pods, alerts, users)
* **Firebase Authentication** (user login/signup)
* **HTML5

---

## 📂 Project Structure

```
/index.html
/style.css
/app.js
/readme.md
/assets/
    icons/
    marker-images/
/testing/
    testing_report.pdf
```

---

## 🚀 How to Run Locally

### 1. Clone Repo

```bash
git clone https://github.com/yourusername/safetypod.git
cd safetypod
```

### 2. Run with any local server

Example using VSCode:

```
Right Click → "Open with Live Server"
```

or using Python:

```bash
python3 -m http.server
```

### 3. Open in Browser

```
http://localhost:8000
```

---

## 🧭 Usage Guide

### Join Pods

1. Open map
2. Tap any pod marker
3. Hit **Join Pod**
4. Green route starts updating

### Create Pod

1. Tap **+** button
2. Fill form
3. Add checkpoints
4. Schedule departure

### SOS

* Click **SOS** button
* Sends alerts + auto-call
* Contacts get location
* Mark *Safe* or *False alert*

---

## 🧩 Future Enhancements

* Live location sharing between members
* Admin dashboard for campus security
* Automatic pod matching by route
* Push notifications for pod updates

---

## 🙌 Acknowledgements

Special thanks to the 100+ CU hostel students who tested this prototype and provided feedback.
Also thanks to campus security for assisting with SOS test calls.


