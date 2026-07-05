import { useState, useEffect, useCallback } from "react";
import "./storage.js"; // sets up window.storage locally via localStorage
import { Compass, Bus, Users, LogOut, Plus, Trash2, ChevronRight, Check, X, Clock, MessageSquareWarning, ArrowLeft, UserPlus, FolderPlus, Lock, Camera, Link2 } from "lucide-react";

// ---------- Storage helpers ----------
const SKEY = {
  users: "camp-users",
  groups: "camp-groups",
  students: "camp-students",
  attendance: "camp-attendance",
  driveLinks: "camp-drive-links",
};

async function loadAll() {
  const out = {};
  for (const [k, key] of Object.entries(SKEY)) {
    try {
      const r = await window.storage.get(key, true);
      out[k] = r ? JSON.parse(r.value) : null;
    } catch {
      out[k] = null;
    }
  }
  return out;
}
async function save(key, value) {
  try {
    await window.storage.set(SKEY[key], JSON.stringify(value), true);
  } catch (e) {
    console.error("storage set failed", key, e);
  }
}

const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);

// Monday of the week containing the given date, used as the week key.
function getWeekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}
function weekRangeLabel(weekKey) {
  const monday = new Date(weekKey + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

const SEED_USERS = [
  { id: "u_admin1", username: "admin1", password: "1234", role: "admin", name: "Camp Director" },
  { id: "u_admin2", username: "admin2", password: "1234", role: "admin", name: "Assistant Director" },
  { id: "u_admin3", username: "admin3", password: "1234", role: "admin", name: "Safety Officer" },
  { id: "u_bus1", username: "bus1", password: "1234", role: "bus_coach", name: "Bus 1 Coach" },
  { id: "u_coach1", username: "coach1", password: "1234", role: "group_coach", name: "Falcons Coach" },
  { id: "u_coach2", username: "coach2", password: "1234", role: "group_coach", name: "Eagles Coach" },
];
const SEED_GROUPS = [
  { id: "g1", name: "Falcons Group", busNumber: "1", groupCoachId: "u_coach1", busCoachId: "u_bus1" },
  { id: "g2", name: "Eagles Group", busNumber: "1", groupCoachId: "u_coach2", busCoachId: "u_bus1" },
];
const SEED_STUDENTS = [
  { id: uid("s"), name: "Ahmad Khaled", groupId: "g1" },
  { id: uid("s"), name: "Yousef Sami", groupId: "g1" },
  { id: uid("s"), name: "Lin Omar", groupId: "g2" },
  { id: uid("s"), name: "Rana Fadi", groupId: "g2" },
];

const STATUS = {
  present: { label: "Present", color: "#2E7D6B", bg: "#E3F3EE", icon: Check },
  absent: { label: "Absent", color: "#B0402E", bg: "#FBE9E5", icon: X },
  late: { label: "Late", color: "#B8862B", bg: "#FBF1DC", icon: Clock },
};

const roleLabel = { admin: "Admin", bus_coach: "Bus Coach", group_coach: "Group Coach" };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [driveLinks, setDriveLinks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("groups"); // groups | sheet | manageCoaches | manageGroups
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const data = await loadAll();
      let u = data.users, g = data.groups, s = data.students, a = data.attendance, d = data.driveLinks;
      if (!u) { u = SEED_USERS; await save("users", u); }
      if (!g) { g = SEED_GROUPS; await save("groups", g); }
      if (!s) { s = SEED_STUDENTS; await save("students", s); }
      if (!a) { a = []; await save("attendance", a); }
      if (!d) { d = []; await save("driveLinks", d); }
      setUsers(u); setGroups(g); setStudents(s); setAttendance(a); setDriveLinks(d);
      setLoading(false);
    })();
  }, []);

  const persistUsers = async (next) => { setUsers(next); await save("users", next); };
  const persistGroups = async (next) => { setGroups(next); await save("groups", next); };
  const persistStudents = async (next) => { setStudents(next); await save("students", next); };
  const persistAttendance = async (next) => { setAttendance(next); await save("attendance", next); };
  const persistDriveLinks = async (next) => { setDriveLinks(next); await save("driveLinks", next); };

  const handleLogin = (username, password) => {
    const u = users.find((x) => x.username === username.trim() && x.password === password);
    if (!u) { setError("Wrong username or password"); return; }
    setError("");
    setCurrentUser(u);
    setView("groups");
  };

  const visibleGroups = useCallback(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return groups;
    if (currentUser.role === "bus_coach") return groups.filter((g) => g.busCoachId === currentUser.id);
    return groups.filter((g) => g.groupCoachId === currentUser.id);
  }, [currentUser, groups]);

  if (loading) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" style={{ color: INK }}>
          <Compass className="animate-spin" size={32} />
          <p style={{ fontFamily: BODY }}>Loading roster...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} error={error} />;
  }

  return (
    <div dir="ltr" style={{ background: BG, minHeight: "100vh", fontFamily: BODY }} className="text-[#1E3A52]">
      <TopBar user={currentUser} onLogout={() => setCurrentUser(null)} />
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {view === "groups" && (
          <GroupsList
            currentUser={currentUser}
            groups={visibleGroups()}
            students={students}
            attendance={attendance}
            date={date}
            onOpen={(id) => { setActiveGroupId(id); setView("sheet"); }}
            onManageCoaches={() => setView("manageCoaches")}
            onManageGroups={() => setView("manageGroups")}
          />
        )}
        {view === "sheet" && (
          <AttendanceSheet
            group={groups.find((g) => g.id === activeGroupId)}
            students={students.filter((s) => s.groupId === activeGroupId)}
            attendance={attendance}
            driveLinks={driveLinks}
            date={date}
            setDate={setDate}
            currentUser={currentUser}
            onSetDriveLink={async (groupId, weekKey, url) => {
              const idx = driveLinks.findIndex((l) => l.groupId === groupId && l.weekKey === weekKey);
              let next;
              if (idx >= 0) {
                next = [...driveLinks];
                next[idx] = { ...next[idx], url };
              } else {
                next = [...driveLinks, { id: uid("dl"), groupId, weekKey, url }];
              }
              await persistDriveLinks(next);
            }}
            onBack={() => setView("groups")}
            onMark={async (studentId, status, note) => {
              const existingIdx = attendance.findIndex((r) => r.studentId === studentId && r.date === date);
              let next;
              const record = { id: uid("a"), studentId, date, status, note, recordedBy: currentUser.name, recordedAt: new Date().toISOString() };
              if (existingIdx >= 0) {
                next = [...attendance];
                next[existingIdx] = { ...next[existingIdx], status, note, recordedBy: currentUser.name, recordedAt: record.recordedAt };
              } else {
                next = [...attendance, record];
              }
              await persistAttendance(next);
            }}
            onAddStudent={async (name) => {
              const next = [...students, { id: uid("s"), name, groupId: activeGroupId }];
              await persistStudents(next);
            }}
            onRemoveStudent={async (studentId) => {
              await persistStudents(students.filter((s) => s.id !== studentId));
            }}
          />
        )}
        {view === "manageCoaches" && currentUser.role === "admin" && (
          <ManageCoaches
            users={users}
            onBack={() => setView("groups")}
            onAdd={async (name, username, role) => {
              const id = uid("u");
              await persistUsers([...users, { id, username, password: "1234", role, name }]);
            }}
            onRemove={async (id) => {
              await persistUsers(users.filter((u) => u.id !== id));
            }}
          />
        )}
        {view === "manageGroups" && currentUser.role === "admin" && (
          <ManageGroups
            groups={groups}
            users={users}
            onBack={() => setView("groups")}
            onAdd={async (name, busNumber, groupCoachId, busCoachId) => {
              await persistGroups([...groups, { id: uid("g"), name, busNumber, groupCoachId, busCoachId }]);
            }}
            onRemove={async (id) => {
              await persistGroups(groups.filter((g) => g.id !== id));
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------- Design tokens: baby blue theme ----------
const BG = "#EAF5FB"; // pale baby blue backdrop
const INK = "#1E3A52"; // deep navy ink for text
const DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const BODY = "'Segoe UI', 'Tahoma', sans-serif";
const PRIMARY = "#3E8FC7"; // main baby-blue accent
const PRIMARY_DARK = "#2C6E91"; // deeper blue for emphasis/buttons
const CARD = "#FFFFFF";
const BORDER = "#CFE6F5";
const MUTED = "#6B87A0";
const RUST = "#B0402E";
const AMBER = "#E7A85C";

function Stamp({ children, tone = PRIMARY_DARK }) {
  return (
    <span
      style={{
        border: `2px solid ${tone}`,
        color: tone,
        borderRadius: 999,
        padding: "2px 10px",
        fontFamily: DISPLAY,
        fontSize: 12,
        letterSpacing: 0.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function LoginScreen({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div
      dir="ltr"
      style={{
        background: `radial-gradient(circle at 20% 15%, #6FB3DD 0%, #3E8FC7 55%, #235E7E 100%)`,
        minHeight: "100vh",
        fontFamily: BODY,
      }}
      className="flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "#EAF5FB", border: `3px solid ${AMBER}` }}>
            <Compass size={30} color={PRIMARY_DARK} />
          </div>
          <h1 style={{ fontFamily: DISPLAY, color: "#F5FAFD", fontSize: 28, letterSpacing: 1 }}>Camp Attendance Log</h1>
          <p style={{ color: "#DCEFFA", fontSize: 13, marginTop: 4 }}>Sign in for coaches &amp; admins</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }}
          style={{ background: CARD, borderRadius: 14, padding: 24, boxShadow: "0 20px 40px rgba(20,60,90,0.35)" }}
          className="flex flex-col gap-4"
        >
          <div>
            <label style={{ fontFamily: DISPLAY, fontSize: 12, color: PRIMARY_DARK, letterSpacing: 0.5 }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. coach1"
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontFamily: DISPLAY, fontSize: 12, color: PRIMARY_DARK, letterSpacing: 0.5 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              style={inputStyle}
            />
          </div>
          {error && (
            <p style={{ color: RUST, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={14} /> {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              background: PRIMARY_DARK,
              color: "#F5FAFD",
              fontFamily: DISPLAY,
              letterSpacing: 1,
              padding: "12px 0",
              borderRadius: 8,
              fontSize: 15,
              marginTop: 4,
            }}
          >
            Sign in
          </button>
          <p style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 4 }}>
            Demo accounts: admin1 / coach1 / bus1 — password: 1234
          </p>
        </form>
      </div>
    </div>
  );
}
const inputStyle = {
  width: "100%",
  border: `2px solid ${BORDER}`,
  background: "#F8FCFE",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 15,
  marginTop: 4,
  color: INK,
  outline: "none",
};

function TopBar({ user, onLogout }) {
  return (
    <div style={{ background: PRIMARY_DARK }} className="text-[#F5FAFD]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass size={22} color={AMBER} />
          <span style={{ fontFamily: DISPLAY, letterSpacing: 0.5, fontSize: 18 }}>Camp Attendance Log</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#BFE0F2" }}>{roleLabel[user.role]}</div>
          </div>
          <button onClick={onLogout} style={{ color: "#F5FAFD" }} className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupsList({ currentUser, groups, students, attendance, date, onOpen, onManageCoaches, onManageGroups }) {
  const countFor = (groupId) => {
    const gStudents = students.filter((s) => s.groupId === groupId);
    const todays = attendance.filter((a) => a.date === date && gStudents.some((s) => s.id === a.studentId));
    const present = todays.filter((a) => a.status === "present").length;
    const absent = todays.filter((a) => a.status === "absent").length;
    return { total: gStudents.length, present, absent, marked: todays.length };
  };

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontFamily: DISPLAY, fontSize: 22, color: PRIMARY_DARK }}>Your Groups ({groups.length})</h2>
        {currentUser.role === "admin" && (
          <div className="flex gap-2">
            <button onClick={onManageGroups} style={pillBtn}>
              <FolderPlus size={15} /> Groups
            </button>
            <button onClick={onManageCoaches} style={pillBtn}>
              <UserPlus size={15} /> Coaches
            </button>
          </div>
        )}
      </div>

      {groups.length === 0 && (
        <div style={{ color: MUTED }} className="text-center py-16">No groups assigned to your account yet.</div>
      )}

      <div className="grid gap-3">
        {groups.map((g) => {
          const c = countFor(g.id);
          return (
            <button
              key={g.id}
              onClick={() => onOpen(g.id)}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}
              className="flex items-center justify-between p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div style={{ background: PRIMARY_DARK, color: "#F5FAFD", width: 40, height: 40, borderRadius: 10 }} className="flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 16, color: INK }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: MUTED }} className="flex items-center gap-1">
                    <Bus size={12} /> Bus {g.busNumber} · {c.total} students
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Stamp tone={PRIMARY_DARK}>{c.present} present</Stamp>
                {c.absent > 0 && <Stamp tone={RUST}>{c.absent} absent</Stamp>}
                <ChevronRight size={18} color={MUTED} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
const pillBtn = {
  display: "flex", alignItems: "center", gap: 6, background: CARD, border: `1px solid ${BORDER}`,
  color: PRIMARY_DARK, padding: "6px 12px", borderRadius: 999, fontSize: 13, fontFamily: DISPLAY,
};

function AttendanceSheet({ group, students, attendance, driveLinks, date, setDate, currentUser, onBack, onMark, onAddStudent, onRemoveStudent, onSetDriveLink }) {
  const [newName, setNewName] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [linkDraft, setLinkDraft] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  if (!group) return null;

  const canManageStudents = currentUser.role === "admin";
  const canEditLink = currentUser.role === "admin" || currentUser.role === "group_coach";
  const recordFor = (studentId) => attendance.find((a) => a.studentId === studentId && a.date === date);
  const weekKey = getWeekKey(date);
  const weekLink = driveLinks.find((l) => l.groupId === group.id && l.weekKey === weekKey);

  return (
    <div className="pt-6">
      <button onClick={onBack} className="flex items-center gap-1 mb-3" style={{ color: PRIMARY_DARK, fontSize: 14 }}>
        <ArrowLeft size={16} /> Back to groups
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 24, color: PRIMARY_DARK }}>{group.name}</h2>
          <div style={{ fontSize: 13, color: MUTED }} className="flex items-center gap-1"><Bus size={13} /> Bus {group.busNumber}</div>
        </div>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setEditingLink(false); }} style={{ ...inputStyle, width: "auto" }} />
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }} className="p-3 mb-5 flex items-center justify-between flex-wrap gap-2">
        {weekLink && !editingLink ? (
          <>
            <a
              href={weekLink.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: PRIMARY_DARK, fontFamily: DISPLAY, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
            >
              <Camera size={16} /> Photos for week of {weekRangeLabel(weekKey)}
            </a>
            {canEditLink && (
              <button onClick={() => { setLinkDraft(weekLink.url); setEditingLink(true); }} style={{ fontSize: 12, color: MUTED }}>
                Edit link
              </button>
            )}
          </>
        ) : canEditLink ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (linkDraft.trim()) { onSetDriveLink(group.id, weekKey, linkDraft.trim()); setEditingLink(false); } }}
            className="flex items-center gap-2 w-full"
          >
            <Link2 size={16} color={MUTED} />
            <input
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              placeholder={`Drive link for week of ${weekRangeLabel(weekKey)}`}
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
              autoFocus
            />
            <button type="submit" style={{ ...pillBtn, background: PRIMARY_DARK, color: "#F5FAFD" }}>Save</button>
          </form>
        ) : (
          <span style={{ fontSize: 13, color: MUTED }} className="flex items-center gap-2">
            <Camera size={16} /> No photo link added for this week yet
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {students.map((s) => {
          const rec = recordFor(s.id);
          return (
            <div key={s.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontFamily: DISPLAY, fontSize: 16, color: INK }}>{s.name}</span>
                {canManageStudents && (
                  <button onClick={() => onRemoveStudent(s.id)} style={{ color: RUST }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                {Object.entries(STATUS).map(([key, val]) => {
                  const Icon = val.icon;
                  const active = rec?.status === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onMark(s.id, key, noteDrafts[s.id] ?? rec?.note ?? "")}
                      style={{
                        flex: 1,
                        background: active ? val.bg : "#F2F8FC",
                        color: active ? val.color : MUTED,
                        border: `1.5px solid ${active ? val.color : BORDER}`,
                        borderRadius: 8,
                        padding: "8px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontSize: 13,
                        fontFamily: DISPLAY,
                      }}
                    >
                      <Icon size={14} /> {val.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <MessageSquareWarning size={14} color={MUTED} />
                <input
                  placeholder="Note (health, behavior...)"
                  defaultValue={rec?.note || ""}
                  onChange={(e) => setNoteDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                  onBlur={(e) => rec && onMark(s.id, rec.status, e.target.value)}
                  style={{ ...inputStyle, marginTop: 0, fontSize: 13, padding: "6px 10px" }}
                />
              </div>
              {rec && (
                <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                  Last updated by {rec.recordedBy}
                </div>
              )}
            </div>
          );
        })}
        {students.length === 0 && <p style={{ color: MUTED, textAlign: "center" }} className="py-8">No students in this group yet.</p>}
      </div>

      {canManageStudents && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { onAddStudent(newName.trim()); setNewName(""); } }}
          className="flex gap-2 mt-4"
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New student name" style={inputStyle} />
          <button type="submit" style={{ ...pillBtn, background: PRIMARY_DARK, color: "#F5FAFD" }}>
            <Plus size={15} /> Add
          </button>
        </form>
      )}
    </div>
  );
}

function ManageCoaches({ users, onBack, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("group_coach");

  return (
    <div className="pt-6">
      <button onClick={onBack} className="flex items-center gap-1 mb-3" style={{ color: PRIMARY_DARK, fontSize: 14 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 22, color: PRIMARY_DARK }} className="mb-4">Coaches &amp; Admins</h2>

      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim() && username.trim()) { onAdd(name.trim(), username.trim(), role); setName(""); setUsername(""); } }}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}
        className="p-4 flex flex-col gap-2 mb-5"
      >
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" style={inputStyle} />
        </div>
        <div className="flex gap-2 items-center">
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="group_coach">Group Coach</option>
            <option value="bus_coach">Bus Coach</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" style={{ ...pillBtn, background: PRIMARY_DARK, color: "#F5FAFD" }}>
            <Plus size={15} /> Add (default password: 1234)
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }} className="p-3 flex items-center justify-between">
            <div>
              <div style={{ fontFamily: DISPLAY, color: INK }}>{u.name} <span style={{ fontSize: 12, color: MUTED }}>@{u.username}</span></div>
              <Stamp tone={u.role === "admin" ? RUST : PRIMARY_DARK}>{roleLabel[u.role]}</Stamp>
            </div>
            <button onClick={() => onRemove(u.id)} style={{ color: RUST }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageGroups({ groups, users, onBack, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [groupCoachId, setGroupCoachId] = useState("");
  const [busCoachId, setBusCoachId] = useState("");

  const groupCoaches = users.filter((u) => u.role === "group_coach");
  const busCoaches = users.filter((u) => u.role === "bus_coach");
  const nameOf = (id) => users.find((u) => u.id === id)?.name || "—";

  return (
    <div className="pt-6">
      <button onClick={onBack} className="flex items-center gap-1 mb-3" style={{ color: PRIMARY_DARK, fontSize: 14 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 22, color: PRIMARY_DARK }} className="mb-4">Groups &amp; Buses</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && busNumber.trim() && groupCoachId && busCoachId) {
            onAdd(name.trim(), busNumber.trim(), groupCoachId, busCoachId);
            setName(""); setBusNumber(""); setGroupCoachId(""); setBusCoachId("");
          }
        }}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}
        className="p-4 flex flex-col gap-2 mb-5"
      >
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" style={inputStyle} />
          <input value={busNumber} onChange={(e) => setBusNumber(e.target.value)} placeholder="Bus number" style={inputStyle} />
        </div>
        <div className="flex gap-2">
          <select value={groupCoachId} onChange={(e) => setGroupCoachId(e.target.value)} style={inputStyle}>
            <option value="">Group coach</option>
            {groupCoaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={busCoachId} onChange={(e) => setBusCoachId(e.target.value)} style={inputStyle}>
            <option value="">Bus coach</option>
            {busCoaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button type="submit" style={{ ...pillBtn, background: PRIMARY_DARK, color: "#F5FAFD", justifyContent: "center" }}>
          <Plus size={15} /> Add group
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {groups.map((g) => (
          <div key={g.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }} className="p-3 flex items-center justify-between">
            <div>
              <div style={{ fontFamily: DISPLAY, color: INK }}>{g.name} — Bus {g.busNumber}</div>
              <div style={{ fontSize: 12, color: MUTED }}>Group coach: {nameOf(g.groupCoachId)} · Bus coach: {nameOf(g.busCoachId)}</div>
            </div>
            <button onClick={() => onRemove(g.id)} style={{ color: RUST }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
