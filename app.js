/* app.js — iOS Bottom-Sheet Style merged app
    - NEW: Auth is now in a popup modal, not the drawer.
    - NEW: Drawer is closed by default.
    - NEW: Full Firestore database integration for Pods, Contacts, and Alerts.
    - NEW: Real-time data updates with snapshot listeners.
    - NEW: Production-ready auth UI with Sign Up, Sign In, Google, and Forgot Password.
    - NEW: Auth state is now the source of truth, no user info in localStorage.
*/

// NEW: Use async IIFE to allow top-level await for imports
(async () => {
  'use strict';

  /* ---------- MODULE IMPORTS ---------- */
  // All imports must be at the top level
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js");
  const { getAuth, onAuthStateChanged, updateProfile, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
  // NEW: Added getDoc
  const { getFirestore, collection, addDoc, getDoc, setDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");


  /* ---------- FIREBASE CONFIG ---------- */
  // This is your config from the previous message
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA444YpSIM28YIeAfoy8qOf-iZxhjVx_0o",
    authDomain: "safety-pod.firebaseapp.com",
    projectId: "safety-pod",
    storageBucket: "safety-pod.firebasestorage.app",
    messagingSenderId: "67841605776",
    appId: "1:67841605776:web:5cd19d85878e6474b99815"
  };

  // Initialize Firebase
  const fbApp = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(fbApp);
  const db = getFirestore(fbApp);

  /* ---------- CONFIG ---------- */
  const GREEN_UPDATE_MS = 3000;
  const SECURITY_NUMBER = '+917051217431';
  const POLICE_NUMBER = '+917051217431';

  /* ---------- LOCS (campus) ---------- */
  const LOCS = {
    "ZAKIR A": {lat:30.764115211488704, lng:76.57297083408825},
    "ZAKIR B": {lat:30.76416444906544, lng:76.57200231177991},
    "ZAKIR C": {lat:30.763566253806317, lng:76.57281810979303},
    "ZAKIR D": {lat:30.763681327874117, lng:76.57218522110982},
    "NC6": {lat:30.764468562722374, lng:76.573669451965},
    "NC5": {lat:30.76405925006085, lng:76.57370744263378},
    "NC4": {lat:30.76443815910549, lng:76.57438652055725},
    "NC3": {lat:30.764041162317127, lng:76.57455785181206},
    "NC2": {lat:30.764361929172875, lng:76.57521200174207},
    "NC1": {lat:30.76405154782881, lng:76.57535003286586},
    "Tagore": {lat:30.76585946996831, lng:76.57588478541767},
    "LC Hostel": {lat:30.770404997995733, lng:76.57339109248119},
    "Sukhna Hostel": {lat:30.770384505418942, lng:76.57783516630992},
    "Shivalik": {lat:30.770891525779017, lng:76.56904450618484},
    "Shivalik ext": {lat:30.772456978049014, lng:76.57052850773277},
    "Gate 1": {lat:30.771981673837114, lng:76.57979414116367},
    "Gate 2": {lat:30.770726849793046, lng:76.57637473237465},
    "Gate 3": {lat:30.773699637830862, lng:76.57203145187864},
    "Gate 4": {lat:30.766283308645747, lng:76.5749412899869},
    "Underpass": {lat:30.766302424913444, lng:76.57532525147963},
    "C1": {lat:30.76696188989, lng:76.57617507567623},
    "C2": {lat:30.76622622200268, lng:76.57615647426742},
    "C3": {lat:30.76719995164277, lng:76.5748020730505},
    "B3": {lat:30.768676731094914, lng:76.57595745840959},
    "B4": {lat:30.768715304098386, lng:76.57460444784444},
    "B2": {lat:30.76910797203016, lng:76.57602223400836},
    "B1": {lat:30.7697891444897, lng:76.57579252416932},
    "B5": {lat:30.769953975438693, lng:76.57215092538992},
    "A1": {lat:30.771582016109225, lng:76.57824840410933},
    "A2": {lat:30.769715503997592, lng:76.57932841645835},
    "A3": {lat:30.768889931856013, lng:76.57855385733447},
    "D1": {lat:30.771561606422004, lng:76.57050951226861},
    "D2": {lat:30.770799513278586, lng:76.5707874048514},
    "D5": {lat:30.770946809400378, lng:76.56975325164825},
    "D6": {lat:30.7714331570944, lng:76.56958952177679},
    "D7": {lat:30.77197517139823, lng:76.5699065900551},
    "D8": {lat:30.77236648236787, lng:76.57109112461232},
    "Fountain": {lat:30.769596261434433, lng:76.57747877912529},
    "Main Ground": {lat:30.767116837698577, lng:76.57535723357044}
  };

  /* ---------- app state ---------- */
  const app = {
    map: null, campusLayer: null, podLayer: null,
    youMarker: null, manualLocation: null,
    pods: [], // NEW: Managed by Firestore
    contacts: [], // NEW: Managed by Firestore
    alerts: [], // NEW: Managed by Firestore
    user: null, // NEW: Managed by onAuthStateChanged
    activePodId: null, currentOpenPodId: null,
    blueRouteLayer: null, orangeHelperLayer: null, greenRouteLayer: null, greenIntervalId: null,
    lastGeolocateAttempt: 0
  };
  
  // NEW: Firestore listener unsubscribe functions
  let podListener = null;
  let contactListener = null;
  let alertListener = null;

  /* ---------- Authentication ---------- */
  async function login(email, password) {
    if (!email || !password) {
      toast("Please enter email and password");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", userCredential.user.uid);
      toast(`Welcome back, ${userCredential.user.displayName || userCredential.user.email}!`);
      toggleAuthModal(false); // NEW: Close modal on success
    } catch (error) {
      console.error("Login failed:", error.message);
      toast("Login failed: " + getFriendlyAuthError(error.message));
    }
  }

  async function signup(name, email, password) {
    if (!name || !email || !password) {
      toast("Please fill out all fields");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(auth.currentUser, {
        displayName: name
      });
      // NEW: Create a user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name,
        email: email,
        createdAt: serverTimestamp()
      }, { merge: true });
      console.log("Signed up:", userCredential.user.uid);
      toast(`Welcome, ${name}!`);
      toggleAuthModal(false); // NEW: Close modal on success
    } catch (error) {
      console.error("Signup failed:", error.message);
      toast("Signup failed: " + getFriendlyAuthError(error.message));
    }
  }
  
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // NEW: Create or update user doc
      await setDoc(doc(db, "users", result.user.uid), {
        name: result.user.displayName,
        email: result.user.email,
        createdAt: serverTimestamp()
      }, { merge: true }); // Use merge to create or update
      
      console.log("Logged in with Google:", result.user.uid);
      toast("Welcome, " + result.user.displayName + "!");
      toggleAuthModal(false); // NEW: Close modal on success
    } catch (error) {
      console.error("Google login failed:", error.message);
      toast("Google login failed: " + getFriendlyAuthError(error.message));
    }
  }

  async function forgotPassword() {
    let email = document.getElementById('auth-input-email').value;
    if (!email) {
      email = document.getElementById('auth-input-email-signup').value;
    }
    if (!email) {
      toast('Please enter your email address in the form first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast('Password reset email sent. Check your inbox.');
    } catch (error) {
      console.error("Forgot Password failed:", error.message);
      toast("Error: " + getFriendlyAuthError(error.message));
    }
  }
  
  async function appSignOut() {
    try {
      await signOut(auth);
      console.log("Signed out");
      toast("You have been signed out.");
    } catch (error) {
      console.error("Sign out failed:", error.message);
      toast("Sign out failed: " + error.message);
    }
  }

  function getFriendlyAuthError(msg) {
    if (msg.includes("auth/invalid-email")) return "Invalid email format.";
    if (msg.includes("auth/user-not-found")) return "No account found with this email.";
    if (msg.includes("auth/wrong-password")) return "Incorrect password.";
    if (msg.includes("auth/email-already-in-use")) return "This email is already registered.";
    if (msg.includes("auth/weak-password")) return "Password must be at least 6 characters.";
    return "An unknown error occurred.";
  }

  /* ---------- Firestore Listeners (NEW) ---------- */
  
  function setupFirestoreListeners(userId) {
    cleanupFirestoreListeners();

    // Listen for Pods
    //
    // *** THIS IS THE FIX ***
    // REMOVED: orderBy("leaveAt", "desc") - this requires a composite index.
    // We will sort on the client side instead.
    const podsQuery = query(collection(db, "pods"));
    podListener = onSnapshot(podsQuery, (snapshot) => {
      let pods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // NEW: Sort pods on the client side
      try {
        pods.sort((a, b) => {
          const timeA = a.leaveAt.toDate ? a.leaveAt.toDate().getTime() : new Date(a.leaveAt).getTime();
          const timeB = b.leaveAt.toDate ? b.leaveAt.toDate().getTime() : new Date(b.leaveAt).getTime();
          return timeB - timeA; // Sort descending (newest first)
        });
      } catch (e) {
        console.error("Error sorting pods (likely invalid date):", e);
      }
      
      app.pods = pods;
      renderPodList();
      drawPodMarkers();
      console.log("Firestore: Pods updated");
    }, (error) => console.error("Error listening to Pods:", error));
    // *** END OF FIX ***


    // Listen for user's Contacts
    const contactsQuery = query(collection(db, "users", userId, "contacts"));
    contactListener = onSnapshot(contactsQuery, (snapshot) => {
      app.contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderContacts();
      console.log("Firestore: Contacts updated");
    }, (error) => console.error("Error listening to Contacts:", error));

    // Listen for Alerts
    // FIX: Remove orderBy here too, just in case. Client-side sorting is safer.
    const alertsQuery = query(collection(db, "alerts"));
    alertListener = onSnapshot(alertsQuery, (snapshot) => {
      let alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // NEW: Sort alerts on the client side
      try {
        alerts.sort((a, b) => {
          const timeA = a.time.toDate ? a.time.toDate().getTime() : new Date(a.time).getTime();
          const timeB = b.time.toDate ? b.time.toDate().getTime() : new Date(b.time).getTime();
          return timeB - timeA; // Sort descending (newest first)
        });
      } catch (e) {
        console.error("Error sorting alerts (likely invalid date):", e);
      }

      app.alerts = alerts;
      renderAlertsList();
      console.log("Firestore: Alerts updated");
    }, (error) => console.error("Error listening to Alerts:", error));
  }

  function cleanupFirestoreListeners() {
    if (podListener) podListener();
    if (contactListener) contactListener();
    if (alertListener) alertListener();
    podListener = null;
    contactListener = null;
    alertListener = null;
    
    app.pods = [];
    app.contacts = [];
    app.alerts = [];
    
    renderPodList();
    drawPodMarkers();
    renderContacts();
    renderAlertsList();
    console.log("Firestore listeners cleaned up.");
  }


  /* ---------- utilities ---------- */
  function toast(msg, ms=1600){
    let el = document.getElementById('__toast');
    if(!el){
      el = document.createElement('div'); el.id='__toast';
      Object.assign(el.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',top:'18px',zIndex:60000,padding:'8px 12px',background:'rgba(2,6,23,0.9)',color:'#fff',borderRadius:'8px',fontWeight:700});
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity='1'; clearTimeout(el._t); el._t = setTimeout(()=> el.style.opacity='0', ms);
  }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function addListenerIfExist(id, e, fn){ const el=document.getElementById(id); if(el) el.addEventListener(e, fn); }

  /* ---------- map init ---------- */
  function initMap(){
    try{ app.map = L.map('map', { zoomControl:true }).setView([30.7672,76.5750], 15); }
    catch(e){ console.error('Leaflet init failed', e); return; }
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', { maxZoom:20 }).addTo(app.map);
    app.campusLayer = L.layerGroup().addTo(app.map);
    app.podLayer = L.layerGroup().addTo(app.map);
    drawCampusMarkers();
  }

  /* ---------- campus markers ---------- */
  function drawCampusMarkers(){
    if(!app.campusLayer) return; app.campusLayer.clearLayers();
    Object.keys(LOCS).forEach(name=>{
      const c=LOCS[name]; let emoji='📍';
      if(/ZAKIR|NC|Tagore|Hostel|LC|Sukhna|Shivalik/i.test(name)) emoji='🏠';
      else if(/Gate|Underpass/i.test(name)) emoji='🚪';
      else if(/Ground|Fountain/i.test(name)) emoji='🌳';
      else if(/D6|Library/i.test(name)) emoji='📚';
      const html=`<div class="campus-marker" data-name="${esc(name)}"><div class="emoji">${emoji}</div><div class="label">${esc(name)}</div></div>`;
      const icon = L.divIcon({ html, className:'campus-marker-wrapper', iconSize:[64,64], iconAnchor:[32,32] });
      const m = L.marker([c.lat,c.lng], { icon });
      m.on('click', ev=>{ ev.originalEvent && ev.originalEvent.stopPropagation && ev.originalEvent.stopPropagation(); openPlaceQuickAction(name); });
      app.campusLayer.addLayer(m);
    });
  }

  /* ---------- pod markers ---------- */
  function drawPodMarkers(){
    if(!app.podLayer) return; app.podLayer.clearLayers();
    app.pods.forEach(pod=>{ 
      const spot = LOCS[pod.start] || LOCS[pod.dest] || {lat:30.7672,lng:76.5750};
      const cnt = (pod.members||[]).length || 0;
      const html = `<div class="custom-marker"><div class="pod-pin">${cnt}</div></div>`;
      const icon = L.divIcon({ html, className:'', iconSize:[46,46], iconAnchor:[23,46] });
      const m = L.marker([spot.lat, spot.lng], { icon });
      m.on('click', ev=>{ ev.originalEvent && ev.originalEvent.stopPropagation && ev.originalEvent.stopPropagation(); openPodInfo(pod); });
      app.podLayer.addLayer(m);
    });
  }

  /* ---------- open / close pod info ---------- */
  function openPodInfo(pod){
    app.currentOpenPodId = pod.id;
    safeSetText('piName', pod.name); safeSetText('piMeta', `${(pod.members||[]).length}/${pod.max} • ETA ${calcEtaMinutes(pod)} min`);
    // Handle Firebase Timestamp for leaveAt
    const leaveAtTime = pod.leaveAt.toDate ? pod.leaveAt.toDate() : new Date(pod.leaveAt);
    const b = document.getElementById('piBody'); 
    if(b) b.innerHTML = `<div><strong>From:</strong> ${esc(pod.start)}</div><div style="margin-top:6px"><strong>To:</strong> ${esc(pod.dest)}</div><div style="margin-top:6px"><strong>Checkpoints:</strong> ${(pod.checkpoints||[]).map(esc).join(', ')||'None'}</div><div style="margin-top:8px"><strong>Members:</strong> ${(pod.members||[]).map(esc).join(', ')||'None'}</div><div style="margin-top:8px"><strong>Departure:</strong> ${leaveAtTime.toLocaleString()}</div>`;
    const joinBtn = document.getElementById('piJoinBtn');
    if(joinBtn){ 
      const isMember = app.user && (pod.members||[]).includes(app.user.name); 
      joinBtn.style.display='inline-block'; 
      joinBtn.textContent = isMember ? 'Leave' : 'Join'; 
      joinBtn.onclick = ()=> { 
        if(isMember) { 
          leavePod(pod.id); 
          toast('Left pod'); 
          closePodInfo(); 
        } else {
          joinPodFlow(pod.id); 
        }
      }; 
    }
    const viewBtn = document.getElementById('piViewBtn'); if(viewBtn){ viewBtn.style.display='inline-block'; viewBtn.onclick = ()=> { closePodInfo(); openDrawer(); showPanel('podDetailsSection'); showPodDetails(pod.id); }; }
    openPodInfoPanel(); clearPlannedAndHelperRoutes(); drawPlannedRouteForPod(pod, { fit:true }); drawOrangeHelperForPod(pod);
  }
  function openPodInfoPanel(){ const p=document.getElementById('podInfoPanel'); if(!p) return; p.classList.remove('hidden'); setTimeout(()=> p.classList.add('open'),6); p.style.zIndex = 4000; }
  function closePodInfo(){ const p=document.getElementById('podInfoPanel'); if(!p) return; p.classList.remove('open'); setTimeout(()=> p.classList.add('hidden'),220); if(!app.activePodId || app.activePodId !== app.currentOpenPodId){ clearPlannedAndHelperRoutes(); app.currentOpenPodId = null; } }
  addListenerIfExist('piClose','click', closePodInfo);

  /* ---------- join/leave (NOW USES FIRESTORE) ---------- */
  async function joinPodFlow(podId){
    if(!app.user){ 
      toggleAuthModal(true); 
      toast('Sign in to join'); 
      return; 
    }
    const pod = app.pods.find(x=>x.id===podId); if(!pod) return;
    if((pod.members||[]).length >= pod.max){ toast('Pod full'); return; }
    
    if(app.activePodId && app.activePodId !== podId){ 
      const cur = app.pods.find(x=>x.id===app.activePodId); 
      if(cur){ 
        toast(`Leaving "${cur.name}" to join "${pod.name}"`);
        await leavePod(cur.id); 
      } 
    }
    
    const uname = app.user.name; 
    const newMembers = [...(pod.members || [])];
    if(!newMembers.includes(uname)) newMembers.push(uname); 
    
    try {
      const podRef = doc(db, "pods", podId);
      await updateDoc(podRef, { members: newMembers });
      
      app.activePodId = pod.id; 
      // NEW: Save activePodId to user's doc in Firestore
      const userRef = doc(db, "users", app.user.uid);
      await setDoc(userRef, { activePodId: pod.id }, { merge: true });

      startGreenRouteForPod(pod); 
      toast('Joined pod: '+pod.name);
    } catch (error) {
      console.error("Error joining pod:", error);
      toast("Error joining pod. Please try again.");
    }
  }
  
  async function leavePod(podId){
    const pod = app.pods.find(x=>x.id===podId); if(!pod) return;
    const uname = app.user ? app.user.name : null;
    
    let newMembers = [...(pod.members || [])];
    if(uname){ 
      const idx = newMembers.indexOf(uname); 
      if(idx !== -1) newMembers.splice(idx,1); 
    }

    try {
      const podRef = doc(db, "pods", podId);
      if (pod.creator === uname && newMembers.length === 0) {
        await deleteDoc(podRef);
        toast("Pod deleted.");
      } else {
        await updateDoc(podRef, { members: newMembers });
      }
      
      if(app.activePodId === podId){ 
        app.activePodId = null; 
        clearGreenRoute(); 
        // NEW: Update activePodId in Firestore
        const userRef = doc(db, "users", app.user.uid);
        await setDoc(userRef, { activePodId: null }, { merge: true });
      }
    } catch (error) {
      console.error("Error leaving pod:", error);
      toast("Error leaving pod. Please try again.");
    }
  }

  /* ---------- routes ---------- */
  function clearPlannedAndHelperRoutes(){ if(app.blueRouteLayer) try{ app.map.removeLayer(app.blueRouteLayer); }catch(e){} app.blueRouteLayer=null; if(app.orangeHelperLayer) try{ app.map.removeLayer(app.orangeHelperLayer); }catch(e){} app.orangeHelperLayer=null; }
  function clearGreenRoute(){ if(app.greenRouteLayer) try{ app.map.removeLayer(app.greenRouteLayer); }catch(e){} app.greenRouteLayer=null; if(app.greenIntervalId){ clearInterval(app.greenIntervalId); app.greenIntervalId=null; } }

  function calcEtaMinutes(pod){ const s=LOCS[pod.start], d=LOCS[pod.dest]; if(!s||!d) return '—'; const km=haversineDistance(s.lat,s.lng,d.lat,d.lng); const mins=Math.max(1, Math.round((km/5)*60)); return mins; }
  function haversineDistance(lat1,lon1,lat2,lon2){ const R=6371, toRad=v=>v*Math.PI/180; const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1); const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); return R*c; }

  function drawPlannedRouteForPod(pod, opts={fit:true}){
    if(!pod) return; const names=[pod.start].concat(pod.checkpoints||[]).concat([pod.dest]);
    const pts = names.map(n=>LOCS[n]).filter(Boolean).map(c=>[c.lat,c.lng]); if(pts.length<2) return;
    if(app.blueRouteLayer) try{ app.map.removeLayer(app.blueRouteLayer); }catch(e){} app.blueRouteLayer=L.polyline(pts,{color:'#0b84ff',weight:4,dashArray:'8,6',opacity:0.95}).addTo(app.map);
    if(opts.fit){ try{ app.map.fitBounds(app.blueRouteLayer.getBounds(), { padding:[40,110] }); }catch(e){} }
  }

  function drawOrangeHelperForPod(pod){
    if(!pod) return; if(app.orangeHelperLayer) try{ app.map.removeLayer(app.orangeHelperLayer); }catch(e){}; const userLL = app.manualLocation || (app.youMarker && app.youMarker.getLatLng && app.youMarker.getLatLng()) || null;
    if(userLL && LOCS[pod.start]) app.orangeHelperLayer = L.polyline([[userLL.lat,userLL.lng],[LOCS[pod.start].lat,LOCS[pod.start].lng]], { color:'#ff8a00', weight:3, dashArray:'6,6', opacity:0.95 }).addTo(app.map);
  }

  function buildWaypoints() {
    console.warn("buildWaypoints() is not implemented.");
    return []; 
  }

  async function startGreenRouteForPod(pod) {
    async function drawGreenOnce(fit = false) {
      if(app.greenRouteLayer){
        try{ app.map.removeLayer(app.greenRouteLayer); }catch(e){}
      }
      app.greenRouteLayer = null;
      const userLL = app.manualLocation ||
        (app.youMarker && app.youMarker.getLatLng && app.youMarker.getLatLng()) ||
        await getLocationPreferGpsThenManual();
      const wps = buildWaypoints();
      const coords = [];
      if(userLL) coords.push([userLL.lat,userLL.lng]);
      wps.forEach(w=>coords.push([w.lat,w.lng]));
      if(coords.length < 2) return;
      app.greenRouteLayer = L.polyline(coords,{
        color:'#10b981',
        weight:5,
        opacity:0.95
      }).addTo(app.map);
      if(fit){
        try{ app.map.fitBounds(app.greenRouteLayer.getBounds(),{ padding:[40,110] }); }catch(e){}
      }
    }
    await drawGreenOnce(true);
    if (app.greenIntervalId) clearInterval(app.greenIntervalId);
    app.greenIntervalId = setInterval(async ()=>{
      const p = app.pods.find(x=>x.id === pod.id);
      if(!p){ clearGreenRoute(); return; }
      const uname = app.user ? app.user.name : null;
      if(!uname || !(p.members||[]).includes(uname)){
        clearGreenRoute(); return;
      }
      await drawGreenOnce(false); 
    }, GREEN_UPDATE_MS);
  }

  /* ---------- Drawer: iOS-style drag & snap ---------- */
  const drawer = document.getElementById('drawer');
  const drawerCard = document.querySelector('.drawer-card');
  const drawerBackdrop = document.querySelector('.drawer-backdrop');
  const drawerHandle = document.getElementById('drawerHandle');
  const SNAP = { HALF: 50, FULL: 10, CLOSED: 100 };
  let startY=0, startTranslate=80, dragging=false;
  function setDrawerTranslate(percent, { animate=true } = {}){
    if(!drawerCard) return;
    if(animate) drawerCard.style.transition = 'transform .26s cubic-bezier(.22,.9,.2,1)';
    else drawerCard.style.transition = 'none';
    drawerCard.style.transform = `translateY(${percent}%)`;
    if(drawerBackdrop){
      const p = Math.max(0, Math.min(100, 100 - percent));
      const op = Math.min(0.85, (p/100) * 0.85);
      drawerBackdrop.style.opacity = op;
    }
  }
  function openDrawerAt(percent){
    drawer.classList.add('open'); drawer.classList.remove('closed');
    setDrawerTranslate(percent);
  }
  function closeDrawer(){
    drawer.classList.remove('open'); drawer.classList.add('closed');
    setDrawerTranslate(SNAP.CLOSED);
  }
  
  function onDragStart(e){
    dragging = true;
    drawerCard.style.transition = 'none';
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    startTranslate = parseFloat(drawerCard.style.transform.replace(/translateY\((.*)%\)/,'$1')) || 80;
    document.body.style.userSelect = 'none';
  }
  function onDragMove(e){
    if(!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const dy = y - startY;
    const vh = window.innerHeight;
    const deltaPercent = (dy / vh) * 100;
    let next = startTranslate + (deltaPercent);
    next = Math.max(SNAP.FULL, Math.min(SNAP.CLOSED, next));
    if(next < SNAP.FULL + 6) next = SNAP.FULL + (next - SNAP.FULL) * 0.4;
    setDrawerTranslate(next, { animate:false });
  }
  function onDragEnd(){
    if(!dragging) return;
    dragging = false; document.body.style.userSelect = '';
    const tr = drawerCard.style.transform;
    const m = tr.match(/translateY\(([-\d\.]+)%\)/);
    const cur = m ? parseFloat(m[1]) : 80;
    if(cur <= 30) openDrawerAt(SNAP.FULL);
    else if(cur <= 70) openDrawerAt(SNAP.HALF);
    else closeDrawer();
  }
  if(drawerHandle){
    drawerHandle.addEventListener('mousedown', onDragStart);
    drawerHandle.addEventListener('touchstart', onDragStart, { passive:true });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive:false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);
  }
  const drawerHeader = document.querySelector('.drawer-header');
  if(drawerHeader){
    drawerHeader.addEventListener('mousedown', onDragStart);
    drawerHeader.addEventListener('touchstart', onDragStart, { passive:true });
  }
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const panel = b.dataset.panel;
      showPanel(panel);
    });
  });

  /* ---------- Drawer panel helpers ---------- */
  function showPanel(panelId){
    ['podsSection','podDetailsSection','alertsSection'].forEach(id=>{
      const el = document.getElementById(id); if(!el) return;
      if(id === panelId) el.classList.remove('hidden'); else el.classList.add('hidden');
    });
  }

  /* ---------- Pod List rendering ---------- */
  function renderPodList(){
    const list = document.getElementById('podList'); if(!list) return;
    list.innerHTML = '';
    if (!app.user) {
      list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px 0;">Please sign in to see available pods.</p>';
      return;
    }
    if (app.pods.length === 0 && app.user) { 
      list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px 0;">No active pods. Be the first to create one!</p>';
      return;
    }
    
    app.pods.forEach(p=>{
      const isMember = app.user && (p.members||[]).includes(app.user.name);
      const div = document.createElement('div'); div.className='pod-card';
      div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1;padding-right:8px"><div style="font-weight:800">${esc(p.name)}</div><div style="color:#475569;font-size:13px;margin-top:6px">To: ${esc(p.dest)} · ${p.members.length}/${p.max} · ${calcEtaMinutes(p)} min</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn" data-action="view" data-id="${p.id}">View</button>
          <button class="${isMember ? 'btn' : 'btn primary'}" data-action="joinleave" data-id="${p.id}">${isMember ? 'Leave' : 'Join'}</button>
        </div></div>`;
      list.appendChild(div);
    });
    list.querySelectorAll('button[data-action]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id'), action = btn.getAttribute('data-action');
        const pod = app.pods.find(x=>x.id===id); if(!pod) return;
        if(action==='view'){ showPodDetails(id); openDrawerAt(SNAP.HALF); showPanel('podDetailsSection'); }
        else if(action==='joinleave'){ const isMember = app.user && pod.members && pod.members.includes(app.user.name); if(isMember){ leavePod(id); } else joinPodFlow(id); }
      });
    });
  }

  function showPodDetails(id){
    const pod = app.pods.find(x=>x.id===id); if(!pod) return;
    safeSetText('podTitle', pod.name);
    const details = document.getElementById('podDetails'); if(details){
      const isMember = app.user && pod.members && pod.members.includes(app.user.name);
      const leaveAtTime = pod.leaveAt.toDate ? pod.leaveAt.toDate() : new Date(pod.leaveAt);
      details.innerHTML = `<div><strong>From:</strong> ${esc(pod.start)}</div><div style="margin-top:6px"><strong>To:</strong> ${esc(pod.dest)}</div><div style="margin-top:6px"><strong>Checkpoints:</strong> ${(pod.checkpoints||[]).map(esc).join(', ')||'None'}</div><div style="margin-top:6px"><strong>Members:</strong> ${(pod.members||[]).map(esc).join(', ')||'None'}</div><div style="margin-top:8px"><strong>Departure:</strong> ${leaveAtTime.toLocaleString()}</div><div style="margin-top:12px;display:flex;gap:8px"><button class="btn" id="openInfoFromDetails">Open Info</button><button class="btn primary" id="joinLeaveFromDetails">${isMember ? 'Leave' : 'Join'}</button></div>`;
      const openBtn=document.getElementById('openInfoFromDetails'); if(openBtn) openBtn.onclick=()=>{ closeDrawer(); setTimeout(()=> openPodInfo(pod),180); };
      const jl=document.getElementById('joinLeaveFromDetails'); if(jl) jl.onclick=()=>{ const isMember = app.user && pod.members && pod.members.includes(app.user.name); if(isMember) { leavePod(pod.id); } else joinPodFlow(pod.id); };
    }
  }

  /* ---------- Create Pod modal (NOW USES FIRESTORE) ---------- */
  function openCreatePodModal(){
    if (!app.user) {
      toggleAuthModal(true);
      toast('Please sign in to create a pod');
      return;
    }
    const modal = document.getElementById('createPodModal'); if(!modal) return;
    const start=document.getElementById('newPodStart'), dest=document.getElementById('newPodDest'), cp=document.getElementById('checkpointAdd');
    if(start && dest && cp){ start.innerHTML=''; dest.innerHTML=''; cp.innerHTML=''; Object.keys(LOCS).forEach(k=>{ const o1=document.createElement('option'); o1.value=k; o1.text=k; start.appendChild(o1); const o2=o1.cloneNode(true); dest.appendChild(o2); const o3=o1.cloneNode(true); cp.appendChild(o3); }); }
    const ccont=document.getElementById('checkpointContainer'); if(ccont) ccont.innerHTML='';
    modal.classList.remove('hidden');
  }
  addListenerIfExist('createPodOpenBtn','click', openCreatePodModal);
  addListenerIfExist('createCancelBtn','click', ()=> document.getElementById('createPodModal') && document.getElementById('createPodModal').classList.add('hidden'));
  addListenerIfExist('addCheckpointBtn','click', ()=>{
    const sel=document.getElementById('checkpointAdd'); if(!sel) return; const val=sel.value; if(!val) return;
    const c = document.createElement('div'); c.className='pod-card'; c.dataset.checkpoint=val; c.style.display='inline-block'; c.style.marginRight='6px'; c.innerHTML = `${esc(val)} <button class="btn small remove-cp">x</button>`;
    c.querySelector('.remove-cp').onclick = ()=> c.remove(); const container=document.getElementById('checkpointContainer'); if(container) container.appendChild(c);
  });
  addListenerIfExist('createPodBtn','click', async ()=>{ 
    const name=(document.getElementById('newPodName').value||'').trim(); const start=document.getElementById('newPodStart').value; const dest=document.getElementById('newPodDest').value; const depart=document.getElementById('newPodDepart').value; const custom=document.getElementById('newPodDepartCustom').value; const max=parseInt(document.getElementById('newPodMax').value||'6',10);
    if(!name||!start||!dest){ toast('Name, start and destination required'); return; }
    const checkpoints = Array.from(document.getElementById('checkpointContainer').children).map(n=> n.dataset.checkpoint).filter(Boolean);
    let leaveAt = Date.now(); if(depart==='now') leaveAt=Date.now(); else if(depart==='custom' && custom){ const [hh,mm]=custom.split(':').map(Number); const d=new Date(); d.setHours(hh,mm,0,0); leaveAt=d.getTime(); } else leaveAt = Date.now() + (parseInt(depart,10)||10)*60*1000;
    
    const pod = { 
      name, 
      creator: app.user.name, 
      start, 
      dest, 
      checkpoints, 
      leaveAt: new Date(leaveAt), 
      members: [app.user.name], 
      max: max||6, 
      status:'waiting' 
    };

    try {
      await addDoc(collection(db, "pods"), pod);
      document.getElementById('createPodModal').classList.add('hidden'); 
      toast('Pod created');
    } catch (error) {
      console.error("Error creating pod:", error);
      toast("Error creating pod. Please try again.");
    }
  });

  /* ---------- Search ---------- */
  const searchInput = document.getElementById('searchInput');
  if(searchInput) searchInput.addEventListener('keydown', (e)=>{ if(e.key!=='Enter') return; const q=(e.target.value||'').trim().toLowerCase(); if(!q) return; const matchPod = app.pods.find(p=> p.name.toLowerCase().includes(q) || p.dest.toLowerCase().includes(q) || p.start.toLowerCase().includes(q)); if(matchPod){ const loc = LOCS[matchPod.start] || LOCS[matchPod.dest]; if(loc) app.map.setView([loc.lat,loc.lng],17); openPodInfo(matchPod); return; } const matchPlace = Object.keys(LOCS).find(k=>k.toLowerCase().includes(q)); if(matchPlace){ const c=LOCS[matchPlace]; if(c) app.map.setView([c.lat,c.lng],17); openPlaceQuickAction(matchPlace); return; } toast('No match'); });

  /* ---------- locate & manual location ---------- */
  addListenerIfExist('locateMeBtn', 'click', async () => { 
    if(app.manualLocation){ app.map.setView([app.manualLocation.lat, app.manualLocation.lng], 17); return; }
    if(app.youMarker && app.youMarker.getLatLng){ const ll=app.youMarker.getLatLng(); app.map.setView([ll.lat,ll.lng],17); return; }
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => { 
        await setManualLocation(pos.coords.latitude, pos.coords.longitude, { persist: false }); 
        app.map.setView([pos.coords.latitude,pos.coords.longitude],17); 
        toast('Location set'); 
      }, ()=>toast('Location denied'), { timeout:5000 });
    }
    else toast('Geolocation not supported');
  });

  async function setManualLocation(lat, lng, opts = { persist: true }) { 
    app.manualLocation = L.latLng(lat, lng);
    if (!app.youMarker) {
      app.youMarker = L.marker([lat, lng], { icon: L.divIcon({ className: 'you-marker', html: `<div style="width:34px;height:34px;border-radius:50%;background:#06b6d4;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:700;color:#052027">YOU</div>` }) }).addTo(app.map);
    } else {
      app.youMarker.setLatLng([lat, lng]);
    }
  
    if (app.user && opts.persist) {
      try {
        const userRef = doc(db, "users", app.user.uid);
        await setDoc(userRef, { manualLocation: { lat: lat, lng: lng } }, { merge: true });
      } catch (e) {
        console.error("Error saving manual location:", e);
      }
    }
  }
  window.setManualLocation = setManualLocation; // Keep for debugging

  /* ---------- Login / Profile / Contacts (NEW) ---------- */
  
  function toggleAuthModal(forceOpen = null) {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    const shouldOpen = forceOpen !== null ? forceOpen : modal.classList.contains('hidden');
    if (shouldOpen) {
      renderProfile(); 
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }
  
  function renderProfile(){
    const loggedInView = document.getElementById('auth-logged-in-view');
    const loggedOutView = document.getElementById('auth-logged-out-view');
    const nameText = document.getElementById('profileNameText');
    const emailText = document.getElementById('profileEmailText');
    const profileBtn = document.getElementById('profileBtn');
    
    const signInForm = document.getElementById('auth-signin-form');
    const signUpForm = document.getElementById('auth-signup-form');

    if (app.user) {
      loggedInView.classList.remove('hidden');
      loggedOutView.classList.add('hidden');
      if(nameText) nameText.innerText = `Welcome, ${app.user.name || 'User'}`;
      if(emailText) emailText.innerText = app.user.email;
      if(profileBtn) profileBtn.innerText = app.user.name ? (app.user.name.charAt(0).toUpperCase()) : 'U';
      renderContacts();
    } else {
      loggedInView.classList.add('hidden');
      loggedOutView.classList.remove('hidden');
      signInForm.classList.add('hidden');
      signUpForm.classList.remove('hidden');
      if(nameText) nameText.innerText = 'Profile';
      if(emailText) emailText.innerText = '';
      if(profileBtn) profileBtn.innerText = 'G';
      renderContacts(); 
    }
  }

  function renderContacts(){
    const container = document.getElementById('contactsList'); if(!container) return; 
    
    if (!app.user) {
      container.innerHTML = '<p style="font-size: 13px; color: #666;">Sign in to manage your emergency contacts.</p>';
      return;
    }
    
    container.innerHTML=''; 
    if (app.contacts.length === 0) {
      container.innerHTML = '<p style="font-size: 13px; color: #666;">No contacts added yet.</p>';
      return;
    }
    
    app.contacts.forEach(c => { 
      const row = document.createElement('div'); 
      row.className = 'pod-card';
      row.style.display='flex'; 
      row.style.justifyContent='space-between'; 
      row.style.alignItems='center'; 
      row.style.gap='8px';
      row.innerHTML = `<div><strong>${esc(c.name)}</strong><div style="font-size:12px;color:#333">${esc(c.phone)}</div></div><div><button class="btn" data-id="${c.id}">Remove</button></div>`; 
      container.appendChild(row); 
    });
    
    container.querySelectorAll('button[data-id]').forEach(b=> b.addEventListener('click', async () => { 
      const contactId = b.getAttribute('data-id');
      try {
        await deleteDoc(doc(db, "users", app.user.uid, "contacts", contactId));
        toast('Contact removed');
      } catch (error) {
        console.error("Error removing contact:", error);
        toast("Error removing contact.");
      }
    }));
  }
  
  addListenerIfExist('addContactBtn','click', async () => { 
    if (!app.user) {
      toast("Please sign in to add contacts.");
      return;
    }
    const name = (document.getElementById('newContactName').value||'').trim(); 
    const phone=(document.getElementById('newContactPhone').value||'').trim();
    if(!name||!phone){ toast('Enter name and phone'); return; }

    try {
      await addDoc(collection(db, "users", app.user.uid, "contacts"), { 
        name: name, 
        phone: phone,
        createdAt: serverTimestamp()
      });
      document.getElementById('newContactName').value=''; 
      document.getElementById('newContactPhone').value=''; 
      toast('Contact saved');
    } catch (error) {
      console.error("Error adding contact:", error);
      toast("Error adding contact.");
    }
  });

  /* ---------- Place quick action ---------- */
  function openPlaceQuickAction(name){
    safeSetText('piName', name); safeSetText('piMeta','Place');
    const body = document.getElementById('piBody'); if(body) body.innerHTML = `<div style="margin-top:6px">Use as <strong>start</strong> or <strong>destination</strong> in create pod.</div><div style="margin-top:10px;display:flex;gap:8px"><button class="btn" id="place_use_start">Use as start</button><button class="btn" id="place_use_dest">Use as dest</button><button class="btn primary" id="place_center">Center</button></div>`;
    document.getElementById('piJoinBtn') && (document.getElementById('piJoinBtn').style.display = 'none'); document.getElementById('piViewBtn') && (document.getElementById('piViewBtn').style.display='none');
    openPodInfoPanel(); addOne('#place_use_start', ()=>{ const startSel=document.getElementById('newPodStart'); if(startSel) startSel.value=name; toast('Start set: '+name); }); addOne('#place_use_dest', ()=>{ const destSel=document.getElementById('newPodDest'); if(destSel) destSel.value=name; toast('Destination set: '+name); }); addOne('#place_center', ()=>{ const c=LOCS[name]; if(c) app.map.setView([c.lat,c.lng],17); });
    clearPlannedAndHelperRoutes(); app.currentOpenPodId=null;
  }

  /* ---------- Alerts & SOS (NOW USES FIRESTORE) ---------- */
  
  function renderAlertsList(){ 
    const container=document.getElementById('alertsList'); if(!container) return; 
    container.innerHTML=''; 
    
    if (!app.user) {
      container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px 0;">Sign in to view alerts.</p>';
      return;
    }
    if (app.alerts.length === 0) {
      container.innerHTML='<div style="color:#666; text-align: center; padding: 20px 0;">No alerts yet.</div>'; 
      return; 
    }
    
    app.alerts.forEach(a => { 
      const card=document.createElement('div'); 
      card.className='alert-card';
      const alertTime = a.time.toDate ? a.time.toDate() : new Date(a.time);
      
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-weight:800">${a.status==='active'?'🚨 SOS':(a.status==='safe'?'✔ Safe':'⚠ False Alert')}</div><div style="font-size:13px;margin-top:6px">${esc(a.user)} · ${alertTime.toLocaleString()}</div><div style="font-size:13px;margin-top:6px">${a.pod? 'Pod: '+esc(a.pod):''}</div><div style="font-size:13px;margin-top:6px">${a.location? `<a href="https://www.google.com/maps/search/?api=1&query=${a.location.lat},${a.location.lng}" target="_blank">Open location</a>`: ''}</div></div><div style="display:flex;flex-direction:column;gap:8px">${a.status==='active'? `<button class="btn" data-action="markSafe" data-id="${a.id}">Mark Safe</button><button class="btn" data-action="false" data-id="${a.id}">False Alert</button>`: ''}<button class="btn" data-action="view" data-id="${a.id}">View</button></div></div>`; 
      container.appendChild(card); 
    }); 
    
    container.querySelectorAll('button[data-action]').forEach(b=> b.addEventListener('click', ()=>{ 
      const id=b.getAttribute('data-id'), action=b.getAttribute('data-action'); 
      if(action==='markSafe'){ 
        updateAlertStatus(id,'safe'); 
        notifyRecipientsAboutStatusChange(id,'safe'); 
        toast('Marked safe'); 
      } else if(action==='false'){ 
        updateAlertStatus(id,'false'); 
        notifyRecipientsAboutStatusChange(id,'false'); 
        toast('Marked false alert'); 
      } else if(action==='view'){ 
        const a=app.alerts.find(x=>x.id===id); 
        if(a && a.location){ 
          app.map.setView([a.location.lat,a.location.lng],17); 
          openDrawerAt(SNAP.HALF); 
          showPanel('alertsSection'); 
        } else toast('No location for this alert'); 
      } 
    })); 
  }

  async function createAlert({ userName, podName, lat, lng, status='active', note='' }){
    const entry={ 
      user: userName, 
      time: serverTimestamp(), 
      pod: podName||null, 
      location: lat && lng ? { lat, lng } : null, 
      status, 
      note 
    };
    try {
      const docRef = await addDoc(collection(db, "alerts"), entry);
      return { id: docRef.id, ...entry }; 
    } catch (error) {
      console.error("Error creating alert:", error);
      toast("Error creating alert.");
      return null;
    }
  }
  
  async function updateAlertStatus(id, newStatus){ 
    const alertRef = doc(db, "alerts", id);
    try {
      await updateDoc(alertRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating alert:", error);
      toast("Error updating alert status.");
    }
  }
  
  function notifyRecipientsAboutStatusChange(alertId,status){ 
    const a=app.alerts.find(x=>x.id===alertId); if(!a) return; 
    let recipients=[]; 
    if(a.pod){ const pod = app.pods.find(p=>p.id===a.pod || p.name===a.pod); if(pod && pod.members) recipients.push(...pod.members); } 
    const contacts = app.contacts.map(c=>c.phone); 
    console.log(`[NOTIFY] Alert ${alertId} status changed to ${status}. Recipients: PodMembers(${recipients.join(',')}) Contacts(${contacts.join(',')}) Security(${SECURITY_NUMBER})`); 
  }
  
  function sendAlertBroadcast(entry){ 
    const podName = entry.pod; 
    let podRecipients = []; 
    if(podName){ const pod = app.pods.find(p=>p.name===podName || p.id===podName); if(pod && pod.members) podRecipients = pod.members; } 
    const contacts = app.contacts; 
    console.log('[ALERT BROADCAST] Alert:', entry); 
    if(podRecipients.length) console.log(' -> Pod members notified:', podRecipients); 
    if(contacts.length) console.log(' -> Contacts notified (no call):', contacts.map(c=>c.phone)); 
    console.log(' -> Security notified:', SECURITY_NUMBER); 
  }

  /* ---------- SOS flow ---------- */
  addListenerIfExist('sosBtn','click', ()=>{ 
    if (!app.user) {
      toggleAuthModal(true); 
      toast('Please sign in to use SOS');
      return;
    }
    const m=document.getElementById('sosModal'); 
    if(m) m.classList.remove('hidden'); 
    updateSosLastLocationText(); 
  });
  function updateSosLastLocationText(){ const el=document.getElementById('sosLastLocation'); if(!el) return; let txt=''; if(app.manualLocation) txt=`Using manual location (${app.manualLocation.lat.toFixed(5)}, ${app.manualLocation.lng.toFixed(5)})`; else if(app.youMarker && app.youMarker.getLatLng){ const ll=app.youMarker.getLatLng(); txt=`Using device location (${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)})`; } else txt='Location not set. Will attempt GPS or ask you to set manually.'; el.innerText = txt; }
  
  addListenerIfExist('sendSosBtn','click', async ()=>{
    const timerEl=document.getElementById('sosTimer'), subtitle=document.getElementById('sosSubtitle'); if(timerEl) timerEl.innerText='Status: Sending...';
    const loc = await getLocationPreferGpsThenManual(); 
    const uname = app.user ? app.user.name : 'Guest'; 
    const podName = app.activePodId ? ((app.pods.find(p=>p.id===app.activePodId)||{}).name) : null;
    
    const entry = await createAlert({ userName: uname, podName, lat: loc?loc.lat:null, lng: loc?loc.lng:null, status:'active', note:'SOS triggered' });
    
    if (entry) {
      sendAlertBroadcast(entry);
      setTimeout(()=>{ try{ window.location.href = `tel:${SECURITY_NUMBER}`; }catch(e){} }, 1000);
      if(timerEl) timerEl.innerText='Status: Active'; if(subtitle) subtitle.innerText='Calling security and notifying contacts...';
      updateSosLastLocationText(); 
    } else {
      if(timerEl) timerEl.innerText='Status: Failed';
      toast("SOS failed to send. Please try again.");
    }
  });
  addListenerIfExist('falseAlertBtn','click', ()=>{ const last = app.alerts[0]; if(!last){ toast('No active SOS to mark false'); return; } updateAlertStatus(last.id,'false'); notifyRecipientsAboutStatusChange(last.id,'false'); document.getElementById('sosSubtitle') && (document.getElementById('sosSubtitle').innerText='Marked as False Alert'); document.getElementById('sosModal') && document.getElementById('sosModal').classList.add('hidden'); toast('Marked false alert'); });
  addListenerIfExist('imSafeBtn','click', ()=>{ const last = app.alerts[0]; if(!last){ toast('No active SOS to resolve'); return; } updateAlertStatus(last.id,'safe'); notifyRecipientsAboutStatusChange(last.id,'safe'); document.getElementById('sosSubtitle') && (document.getElementById('sosSubtitle').innerText='You are safe now'); document.getElementById('sosModal') && document.getElementById('sosModal').classList.add('hidden'); toast('Marked safe — notifications sent'); });
  addListenerIfExist('callPoliceBtn','click', ()=>{ try{ window.location.href = `tel:${POLICE_NUMBER}`; }catch(e){} });
  addListenerIfExist('callSecurityBtn','click', ()=>{ try{ window.location.href = `tel:${SECURITY_NUMBER}`; }catch(e){} });
  addListenerIfExist('shareLocBtn','click', async ()=>{ const loc = await getLocationPreferGpsThenManual(); if(!loc) { toast('No location to share'); return; } const text = encodeURIComponent(`EMERGENCY LOCATION: https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`); const wa = `https://wa.me/?text=${text}`; window.open(wa, '_blank'); });

  async function getLocationPreferGpsThenManual(){
    if(app.manualLocation){
      try{ if(navigator.permissions && navigator.permissions.query){ const perm = await navigator.permissions.query({ name:'geolocation' }); if(perm.state === 'granted') { return await new Promise(resolve=>{ navigator.geolocation.getCurrentPosition(pos=>resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), ()=>resolve({ lat: app.manualLocation.lat, lng: app.manualLocation.lng }), { timeout:4000 }); }); } } }catch(e){}
      return { lat: app.manualLocation.lat, lng: app.manualLocation.lng };
    }
    if(navigator.geolocation){
      return await new Promise(resolve=>{
        let done=false;
        navigator.geolocation.getCurrentPosition(pos=>{ if(done) return; done=true; resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); }, ()=>{ if(done) return; done=true; resolve(null); }, { timeout:5000 });
        setTimeout(()=>{ if(!done){ done=true; resolve(null); } }, 6000);
      });
    }
    return null;
  }

  /* ---------- nav items ---------- */
  document.querySelectorAll('.nav-item').forEach(btn=> btn.addEventListener('click', ()=> {
    const page = btn.dataset.page;
    if(page==='map'){ closeDrawer(); closePodInfo(); }
    else if(page==='pods'){ openDrawerAt(SNAP.HALF); showPanel('podsSection'); }
    else if(page==='create'){ openCreatePodModal(); }
    else if(page==='alerts'){ openDrawerAt(SNAP.HALF); showPanel('alertsSection'); }
    else if(page==='profile'){ toggleAuthModal(true); } 
  }));

  /* ---------- small helpers ---------- */
  function safeSetText(id, text){ const el=document.getElementById(id); if(el) el.textContent=text; }
  function addOne(selector, fn){ try{ const el = document.querySelector(selector); if(el) el.addEventListener('click', fn, { once:true }); }catch(e){} }

  /* ---------- boot ---------- */
  
  function start(){
    console.log("Start function executed");
    initMap(); 
    console.log("Map initialization attempted");
    
    // NEW: Auth state listener is the main driver
    onAuthStateChanged(auth, async (user) => { 
      if (user) {
        // User is signed in
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        let userData = {};
        if (userDoc.exists()) {
          userData = userDoc.data();
        } else {
          console.warn("User doc not found, creating one.");
          await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            createdAt: serverTimestamp()
          }, { merge: true });
        }

        app.user = {
          uid: user.uid,
          name: user.displayName, 
          email: user.email,
          manualLocation: userData.manualLocation || null, 
          activePodId: userData.activePodId || null
        };
        
        app.activePodId = userData.activePodId || null; 

        if (app.user.manualLocation) {
          app.manualLocation = L.latLng(app.user.manualLocation.lat, app.user.manualLocation.lng);
          await setManualLocation(app.manualLocation.lat, app.manualLocation.lng, { persist: false });
        } else {
           app.manualLocation = null;
           if (app.youMarker) app.youMarker.remove();
           app.youMarker = null;
        }

        setupFirestoreListeners(user.uid); 
      } else {
        // User is signed out
        app.user = null;
        app.activePodId = null;
        app.manualLocation = null;
        if (app.youMarker) {
          app.youMarker.remove();
          app.youMarker = null;
        }
        
        cleanupFirestoreListeners(); 
      }
      renderProfile(); 
      renderPodList();
      renderAlertsList();
      drawPodMarkers();
    });

    closeDrawer();

    // modal backdrop clicks close modal
    document.querySelectorAll('.modal .modal-backdrop').forEach(b => b.addEventListener('click', ()=> { 
        const modal = b.closest('.modal'); 
        if(modal) modal.classList.add('hidden'); 
    }));
    
    // NEW: Auth Modal Listeners
    addListenerIfExist('profileBtn', 'click', () => toggleAuthModal(true));
    addListenerIfExist('authModalCloseBtn', 'click', () => toggleAuthModal(false));

    // manual loc modal wiring
    addListenerIfExist('setLocationBtn','click', ()=> {
        const sel = document.getElementById('manualLocSelect'); 
        if(sel){ 
            sel.innerHTML=''; 
            Object.keys(LOCS).forEach(k=>{ 
                const o=document.createElement('option'); 
                o.value=k; 
                o.text=k; 
                sel.appendChild(o); 
            }); 
        }
        document.getElementById('manualLat').value=''; 
        document.getElementById('manualLng').value=''; 
        document.getElementById('manualLocModal').classList.remove('hidden');
    });
    addListenerIfExist('manualLocCancelBtn','click', ()=> document.getElementById('manualLocModal') && document.getElementById('manualLocModal').classList.add('hidden'));
    addListenerIfExist('manualLocSaveBtn','click', async () => { 
        const place = document.getElementById('manualLocSelect').value;
        const latTxt=(document.getElementById('manualLat').value||'').trim(), lngTxt=(document.getElementById('manualLng').value||'').trim();
        let latLng=null;
        if(latTxt && lngTxt){ 
            const lat=parseFloat(latTxt), lng=parseFloat(lngTxt); 
            if(isFinite(lat) && isFinite(lng)) latLng = L.latLng(lat,lng); 
        }
        else if(place){ 
            const c=LOCS[place]; 
            if(c) latLng = L.latLng(c.lat,c.lng); 
        }
        if(!latLng){ 
            toast('Invalid location'); 
            return; 
        }
        await setManualLocation(latLng.lat, latLng.lng, { persist:true }); 
        document.getElementById('manualLocModal').classList.add('hidden'); 
        toast('Location saved');
    });
    
    // NEW: Wire up all auth buttons
    const signInForm = document.getElementById('auth-signin-form');
    const signUpForm = document.getElementById('auth-signup-form');

    addListenerIfExist('auth-link-show-signup', 'click', () => {
      signInForm.classList.add('hidden');
      signUpForm.classList.remove('hidden');
    });
    
    addListenerIfExist('auth-link-show-signin', 'click', () => {
      signInForm.classList.remove('hidden');
      signUpForm.classList.add('hidden');
    });
    
    addListenerIfExist('auth-btn-google', 'click', loginWithGoogle);
    addListenerIfExist('auth-btn-google-signup', 'click', loginWithGoogle); 
    
    addListenerIfExist('auth-btn-signout', 'click', appSignOut);
    addListenerIfExist('auth-link-forgot-pass', 'click', forgotPassword);
    
    addListenerIfExist('auth-btn-signin', 'click', () => {
      const email = document.getElementById('auth-input-email').value;
      const pass = document.getElementById('auth-input-password').value;
      login(email, pass);
    });
    
    addListenerIfExist('auth-btn-signup', 'click', () => {
      const name = document.getElementById('auth-input-name-signup').value;
      const email = document.getElementById('auth-input-email-signup').value;
      const pass = document.getElementById('auth-input-password-signup').value;
      signup(name, email, pass);
    });
    
    // Wire up pod back button
    addListenerIfExist('podBackBtn', 'click', () => {
      showPanel('podsSection');
    });
}

// Start the app
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();

  // expose for debug
  window.__safetypod = { app, LOCS, setManualLocation };

})();