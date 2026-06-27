import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Calculator, GraduationCap, LogOut, MapPin, Plus, Save, School, Shield, Trash2, User, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createManagedAuthUser, ensurePassword, loadFirebase, normalizeAuthIdentifier } from './firebaseClient.js';

const defaultSettings = {
  fieldTrainings: [
    { id: 1, name: 'تدريب ميداني (1)', courseNumber: 'EDUC 4201', maxGradeWajahi: 100, maxGradeElectronic: 100 },
    { id: 2, name: 'تدريب ميداني (2)', courseNumber: 'EDUC 4202', maxGradeWajahi: 100, maxGradeElectronic: 100 },
    { id: 3, name: 'تدريب ميداني (3)', courseNumber: 'EDUC 4210', maxGradeWajahi: 100, maxGradeElectronic: 100 },
  ],
  maxGrades: { visit1: 10, visit2: 10, principal: 10, teacher: 10, supervisorEval: 60, assignments: 60, recordedLessons: 40 },
  permissions: { allowStudentViewGrades: false, allowSupervisorGradeEntry: true },
  defaultSemester: '20262',
  allowanceRates: { wajahi: 30, electronic: 20 },
  supervisorInstructions: '',
  studentInstructions: '',
};

const collections = ['officials', 'supervisors', 'students', 'points', 'regions', 'specializations', 'sections', 'auditLogs'];
const labels = {
  dashboard: 'الرئيسية', students: 'الطلاب', supervisors: 'المشرفين', points: 'النقاط التعليمية',
  regions: 'المديريات', specializations: 'التخصصات', sections: 'الشعب', reports: 'التقارير', settings: 'الإعدادات', auditLogs: 'سجل التدقيق', grading: 'إدخال الدرجات',
};

const makeId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emptyStudent = { name: '', studentId: '', idNumber: '', password: '', specialization: '', supervisorId: '', educationalPoint: '', residence: '', phone: '', email: '', trainingType: 'وجاهي', semester: '', program: 'بكالوريوس', fieldTrainingSelections: [], fieldTrainingGrades: {} };
const emptySupervisor = { name: '', employeeId: '', idNumber: '', password: '', specialization: '', currentWorkplace: '', whatsappMobile: '', maxStudents: 10 };
const emptyPoint = { name: '', stage: '', managerName: '', phone: '', location: '', classCount: '' };

function StatCard({ icon: Icon, title, value }) {
  return <div className="card stat"><Icon size={24} /><div><span>{title}</span><strong>{value}</strong></div></div>;
}

function Login({ onLogin, onFirstOfficial, error, loading }) {
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [setup, setSetup] = useState({ name: '', employeeId: '', password: '' });

  return <main className="login-page" dir="rtl">
    <section className="login-card">
      <header><h1>EduPractice</h1><p>نظام الإشراف والتدريب الميداني</p></header>
      <div className="role-tabs">
        {['student', 'supervisor', 'official'].map((item) => <button key={item} className={role === item ? 'active' : ''} onClick={() => setRole(item)}>{item === 'student' ? 'طالب' : item === 'supervisor' ? 'مشرف' : 'مسؤول'}</button>)}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); onLogin(role, username, password); }}>
        <label>{role === 'student' ? 'رقم الطالب' : 'الرقم الوظيفي'}<input required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>كلمة المرور<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="error"><AlertCircle size={16} />{error}</div>}
        <button className="primary" disabled={loading}>{loading ? 'جاري الدخول...' : 'تسجيل الدخول'}</button>
      </form>
      <button className="link" onClick={() => setSetupOpen(!setupOpen)}>تهيئة أول مسؤول للنظام</button>
      {setupOpen && <form className="setup" onSubmit={(event) => { event.preventDefault(); onFirstOfficial(setup); }}>
        <input required placeholder="اسم المسؤول" value={setup.name} onChange={(event) => setSetup({ ...setup, name: event.target.value })} />
        <input required placeholder="الرقم الوظيفي" value={setup.employeeId} onChange={(event) => setSetup({ ...setup, employeeId: event.target.value })} />
        <input required minLength={6} type="password" placeholder="كلمة المرور" value={setup.password} onChange={(event) => setSetup({ ...setup, password: event.target.value })} />
        <button className="secondary">إنشاء المسؤول الأول</button>
      </form>}
      <footer>Firebase project: edupractice-ab9a2</footer>
    </section>
  </main>;
}

function DataTable({ title, rows, columns, onAdd, onEdit, onDelete, canWrite = true }) {
  return <section className="panel">
    <div className="panel-head"><h2>{title}</h2>{canWrite && <button className="primary small" onClick={onAdd}><Plus size={16} />إضافة</button>}</div>
    <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{canWrite && <th>إجراءات</th>}</tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] || '-'}</td>)}{canWrite && <td className="actions"><button onClick={() => onEdit(row)}>تعديل</button><button className="danger" onClick={() => onDelete(row.id)}>حذف</button></td>}</tr>)}
      {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="empty">لا توجد بيانات</td></tr>}
    </tbody></table></div>
  </section>;
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop"><div className="modal"><header><h2>{title}</h2><button onClick={onClose}>×</button></header>{children}</div></div>;
}

function App() {
  const [firebase, setFirebase] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(Object.fromEntries(collections.map((name) => [name, []])));
  const [settings, setSettings] = useState(defaultSettings);
  const [page, setPage] = useState('dashboard');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    let unsubAuth = () => {};
    loadFirebase().then((fb) => {
      setFirebase(fb);
      unsubAuth = fb.modules.auth.onAuthStateChanged(fb.auth, async (authUser) => {
        setLoading(true);
        if (!authUser) { setUser(null); setLoading(false); return; }
        const profile = await fb.modules.firestore.getDoc(fb.modules.firestore.doc(fb.db, 'users', authUser.uid));
        if (!profile.exists()) { await fb.modules.auth.signOut(fb.auth); setUser(null); setLoading(false); return; }
        setUser({ uid: authUser.uid, ...profile.data() });
        setLoading(false);
      });
    }).catch(() => { setError('تعذر الاتصال بخدمات Firebase'); setLoading(false); });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!firebase || !user) return undefined;
    const unsubs = collections.map((name) => firebase.modules.firestore.onSnapshot(firebase.modules.firestore.collection(firebase.db, name), (snapshot) => {
      setData((prev) => ({ ...prev, [name]: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }));
    }));
    unsubs.push(firebase.modules.firestore.onSnapshot(firebase.modules.firestore.doc(firebase.db, 'system', 'main'), (snapshot) => setSettings({ ...defaultSettings, ...(snapshot.exists() ? snapshot.data() : {}) })));
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [firebase, user]);

  const addLog = async (action, details) => {
    if (!firebase || !user) return;
    await firebase.modules.firestore.setDoc(firebase.modules.firestore.doc(firebase.db, 'auditLogs', makeId()), { action, details, performer: user.name, timestamp: new Date().toISOString() });
  };

  const writeDoc = async (collection, record) => {
    const id = record.id || makeId();
    const { id: _id, password, ...payload } = record;
    await firebase.modules.firestore.setDoc(firebase.modules.firestore.doc(firebase.db, collection, id), { ...payload, updatedAt: firebase.modules.firestore.serverTimestamp() }, { merge: true });
    return id;
  };

  const deleteDoc = async (collection, id) => {
    await firebase.modules.firestore.deleteDoc(firebase.modules.firestore.doc(firebase.db, collection, id));
    await addLog(`DELETE_${collection}`, `حذف من ${collection}`);
  };

  const provision = async (role, username, password, profile) => {
    try { return await createManagedAuthUser({ role, username, password: ensurePassword(password, username), profile }); }
    catch (err) { if (err?.code === 'auth/email-already-in-use') return null; throw err; }
  };

  const login = async (role, username, password) => {
    setError(''); setLoading(true);
    try {
      const email = normalizeAuthIdentifier(role, username);
      const credential = await firebase.modules.auth.signInWithEmailAndPassword(firebase.auth, email, password);
      const profile = await firebase.modules.firestore.getDoc(firebase.modules.firestore.doc(firebase.db, 'users', credential.user.uid));
      if (!profile.exists() || profile.data().role !== role) throw new Error('role');
    } catch { setError('بيانات الدخول غير صحيحة أو الحساب غير مفعّل'); }
    finally { setLoading(false); }
  };

  const firstOfficial = async ({ name, employeeId, password }) => {
    setError(''); setLoading(true);
    try {
      const email = normalizeAuthIdentifier('official', employeeId);
      const credential = await firebase.modules.auth.createUserWithEmailAndPassword(firebase.auth, email, ensurePassword(password, employeeId));
      const id = credential.user.uid;
      const profile = { uid: id, recordId: id, role: 'official', name, employeeId, username: employeeId, email };
      await firebase.modules.firestore.setDoc(firebase.modules.firestore.doc(firebase.db, 'users', id), profile, { merge: true });
      await firebase.modules.firestore.setDoc(firebase.modules.firestore.doc(firebase.db, 'officials', id), { name, employeeId, userId: id }, { merge: true });
    } catch { setError('تعذر إنشاء المسؤول الأول. فعّل Email/Password وراجع قواعد Firestore.'); }
    finally { setLoading(false); }
  };

  const saveEntity = async (collection, record) => {
    if (collection === 'supervisors' && !record.id) {
      const id = makeId();
      const account = await provision('supervisor', record.employeeId, record.password || record.idNumber, { role: 'supervisor', recordId: id, name: record.name, employeeId: record.employeeId, idNumber: record.idNumber || '' });
      await writeDoc(collection, { ...record, id, userId: account?.uid || null });
    } else if (collection === 'students' && !record.id) {
      const id = makeId();
      const account = await provision('student', record.studentId, record.password || record.idNumber || record.studentId, { role: 'student', recordId: id, name: record.name, studentId: record.studentId, idNumber: record.idNumber || '', supervisorId: record.supervisorId || '' });
      await writeDoc(collection, { ...record, id, userId: account?.uid || null });
    } else if (collection === 'officials' && !record.id) {
      const id = makeId();
      const account = await provision('official', record.employeeId, record.password || record.employeeId, { role: 'official', recordId: id, name: record.name, employeeId: record.employeeId });
      await writeDoc(collection, { ...record, id, userId: account?.uid || null });
    } else {
      await writeDoc(collection, record);
    }
    await addLog(`SAVE_${collection}`, `حفظ ${record.name || record.studentId || record.employeeId || collection}`);
    setModal(null);
  };

  const exportRows = (rows, filename) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const currentStudent = user?.role === 'student' ? data.students.find((item) => item.id === user.recordId) : null;
  const visibleStudents = user?.role === 'official' ? data.students : user?.role === 'supervisor' ? data.students.filter((item) => item.supervisorId === user.recordId) : currentStudent ? [currentStudent] : [];
  const nav = user?.role === 'official' ? ['dashboard','students','supervisors','points','regions','specializations','sections','reports','settings','auditLogs'] : user?.role === 'supervisor' ? ['dashboard','students','grading'] : ['dashboard','students'];

  if (!user) return <Login onLogin={login} onFirstOfficial={firstOfficial} error={error} loading={loading} />;

  const logout = async () => firebase.modules.auth.signOut(firebase.auth);

  return <div className="app" dir="rtl">
    <aside className="sidebar"><h1>EduPractice</h1><p>{user.name}</p><span>{user.role === 'official' ? 'مسؤول' : user.role === 'supervisor' ? 'مشرف' : 'طالب'}</span>{nav.map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}>{labels[item]}</button>)}<button onClick={logout}><LogOut size={16} />خروج</button></aside>
    <main>
      <header className="top"><h2>{labels[page]}</h2><button onClick={() => exportRows(visibleStudents, 'students')} className="secondary">تصدير الطلاب</button></header>
      {page === 'dashboard' && <section className="grid stats"><StatCard icon={GraduationCap} title="الطلاب" value={data.students.length} /><StatCard icon={Users} title="المشرفين" value={data.supervisors.length} /><StatCard icon={School} title="النقاط" value={data.points.length} /><StatCard icon={MapPin} title="المديريات" value={data.regions.length} /></section>}
      {page === 'students' && <DataTable title="الطلاب" rows={visibleStudents} canWrite={user.role === 'official'} columns={[{ key: 'name', label: 'الاسم' }, { key: 'studentId', label: 'رقم الطالب' }, { key: 'specialization', label: 'التخصص' }, { key: 'trainingType', label: 'نمط التدريب' }, { key: 'supervisorId', label: 'المشرف', render: (row) => data.supervisors.find((s) => s.id === row.supervisorId)?.name || '-' }]} onAdd={() => setModal({ type: 'student', data: { ...emptyStudent, semester: settings.defaultSemester } })} onEdit={(row) => setModal({ type: 'student', data: row })} onDelete={(id) => deleteDoc('students', id)} />}
      {page === 'supervisors' && <DataTable title="المشرفين" rows={data.supervisors} columns={[{ key: 'name', label: 'الاسم' }, { key: 'employeeId', label: 'الرقم الوظيفي' }, { key: 'specialization', label: 'التخصص' }, { key: 'maxStudents', label: 'السعة' }]} onAdd={() => setModal({ type: 'supervisor', data: emptySupervisor })} onEdit={(row) => setModal({ type: 'supervisor', data: row })} onDelete={(id) => deleteDoc('supervisors', id)} />}
      {page === 'points' && <DataTable title="النقاط التعليمية" rows={data.points} columns={[{ key: 'name', label: 'الاسم' }, { key: 'managerName', label: 'المدير' }, { key: 'phone', label: 'الهاتف' }, { key: 'classCount', label: 'الصفوف' }]} onAdd={() => setModal({ type: 'point', data: emptyPoint })} onEdit={(row) => setModal({ type: 'point', data: row })} onDelete={(id) => deleteDoc('points', id)} />}
      {page === 'regions' && <SimpleList title="المديريات" rows={data.regions} collection="regions" setModal={setModal} deleteDoc={deleteDoc} />}
      {page === 'specializations' && <SimpleList title="التخصصات" rows={data.specializations} collection="specializations" setModal={setModal} deleteDoc={deleteDoc} />}
      {page === 'sections' && <SimpleList title="الشعب" rows={data.sections} collection="sections" setModal={setModal} deleteDoc={deleteDoc} />}
      {page === 'reports' && <Reports data={data} />}
      {page === 'auditLogs' && <DataTable title="سجل التدقيق" rows={data.auditLogs} canWrite={false} columns={[{ key: 'timestamp', label: 'الوقت' }, { key: 'performer', label: 'المستخدم' }, { key: 'action', label: 'العملية' }, { key: 'details', label: 'التفاصيل' }]} />}
      {page === 'settings' && <Settings settings={settings} save={async (next) => { await firebase.modules.firestore.setDoc(firebase.modules.firestore.doc(firebase.db, 'system', 'main'), next, { merge: true }); setSettings(next); }} />}
      {page === 'grading' && <Grading students={visibleStudents} trainings={settings.fieldTrainings} update={(student) => saveEntity('students', student)} />}
    </main>
    {modal && <EntityModal modal={modal} settings={settings} data={data} saveEntity={saveEntity} onClose={() => setModal(null)} />}
  </div>;
}

function SimpleList({ title, rows, collection, setModal, deleteDoc }) {
  return <DataTable title={title} rows={rows} columns={[{ key: 'name', label: 'الاسم' }]} onAdd={() => setModal({ type: collection, data: { name: '' } })} onEdit={(row) => setModal({ type: collection, data: row })} onDelete={(id) => deleteDoc(collection, id)} />;
}

function Field({ label, value, onChange, type = 'text', options }) {
  return <label>{label}{options ? <select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">اختر...</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function EntityModal({ modal, data, settings, saveEntity, onClose }) {
  const [form, setForm] = useState(modal.data);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const regionOptions = data.regions.map((r) => ({ value: r.id, label: r.name }));
  const specOptions = data.specializations.map((s) => ({ value: s.name, label: s.name }));
  const supervisorOptions = data.supervisors.map((s) => ({ value: s.id, label: s.name }));
  const pointOptions = data.points.map((p) => ({ value: p.id, label: p.name }));
  const collection = modal.type === 'student' ? 'students' : modal.type === 'supervisor' ? 'supervisors' : modal.type === 'point' ? 'points' : modal.type;

  return <Modal title="حفظ البيانات" onClose={onClose}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); saveEntity(collection, form); }}>
    {modal.type === 'student' && <><Field label="اسم الطالب" value={form.name} onChange={(v) => set('name', v)} /><Field label="رقم الطالب" value={form.studentId} onChange={(v) => set('studentId', v)} /><Field label="رقم الهوية" value={form.idNumber} onChange={(v) => set('idNumber', v)} /><Field label="كلمة المرور" type="password" value={form.password} onChange={(v) => set('password', v)} /><Field label="التخصص" value={form.specialization} onChange={(v) => set('specialization', v)} options={specOptions} /><Field label="المديرية" value={form.residence} onChange={(v) => set('residence', v)} options={regionOptions} /><Field label="المشرف" value={form.supervisorId} onChange={(v) => set('supervisorId', v)} options={supervisorOptions} /><Field label="النقطة التعليمية" value={form.educationalPoint} onChange={(v) => set('educationalPoint', v)} options={pointOptions} /><Field label="الهاتف" value={form.phone} onChange={(v) => set('phone', v)} /><Field label="البريد" value={form.email} onChange={(v) => set('email', v)} /><Field label="نمط التدريب" value={form.trainingType} onChange={(v) => set('trainingType', v)} options={[{ value: 'وجاهي', label: 'وجاهي' }, { value: 'الكتروني', label: 'الكتروني' }]} /></>}
    {modal.type === 'supervisor' && <><Field label="اسم المشرف" value={form.name} onChange={(v) => set('name', v)} /><Field label="الرقم الوظيفي" value={form.employeeId} onChange={(v) => set('employeeId', v)} /><Field label="رقم الهوية" value={form.idNumber} onChange={(v) => set('idNumber', v)} /><Field label="كلمة المرور" type="password" value={form.password} onChange={(v) => set('password', v)} /><Field label="التخصص" value={form.specialization} onChange={(v) => set('specialization', v)} options={specOptions} /><Field label="مديرية العمل" value={form.currentWorkplace} onChange={(v) => set('currentWorkplace', v)} options={regionOptions} /><Field label="واتساب" value={form.whatsappMobile} onChange={(v) => set('whatsappMobile', v)} /><Field label="السعة" type="number" value={form.maxStudents} onChange={(v) => set('maxStudents', Number(v))} /></>}
    {modal.type === 'point' && <><Field label="اسم النقطة" value={form.name} onChange={(v) => set('name', v)} /><Field label="المدير" value={form.managerName} onChange={(v) => set('managerName', v)} /><Field label="الهاتف" value={form.phone} onChange={(v) => set('phone', v)} /><Field label="المديرية" value={form.location} onChange={(v) => set('location', v)} options={regionOptions} /><Field label="عدد الصفوف" value={form.classCount} onChange={(v) => set('classCount', v)} /></>}
    {['regions','specializations','sections'].includes(modal.type) && <Field label="الاسم" value={form.name} onChange={(v) => set('name', v)} />}
    <div className="modal-actions"><button type="button" onClick={onClose}>إلغاء</button><button className="primary"><Save size={16} />حفظ</button></div>
  </form></Modal>;
}

function Reports({ data }) {
  const assigned = data.students.filter((s) => s.supervisorId).length;
  const wajahi = data.students.filter((s) => s.trainingType === 'وجاهي').length;
  return <section className="grid"><StatCard icon={GraduationCap} title="طلاب معينون" value={assigned} /><StatCard icon={Calculator} title="تدريب وجاهي" value={wajahi} /><StatCard icon={Shield} title="مسؤولون" value={data.officials.length} /></section>;
}

function Settings({ settings, save }) {
  const [local, setLocal] = useState(settings);
  return <section className="panel"><div className="panel-head"><h2>إعدادات النظام</h2><button className="primary small" onClick={() => save(local)}><Save size={16} />حفظ</button></div><div className="form-grid"><Field label="الفصل الافتراضي" value={local.defaultSemester} onChange={(v) => setLocal({ ...local, defaultSemester: v })} /><Field label="إعلان المشرفين" value={local.supervisorInstructions} onChange={(v) => setLocal({ ...local, supervisorInstructions: v })} /><Field label="إعلان الطلاب" value={local.studentInstructions} onChange={(v) => setLocal({ ...local, studentInstructions: v })} /></div></section>;
}

function Grading({ students, trainings, update }) {
  const [selected, setSelected] = useState(null);
  const [grades, setGrades] = useState({});
  if (!selected) return <DataTable title="طلابي" rows={students} canWrite={false} columns={[{ key: 'name', label: 'الطالب' }, { key: 'studentId', label: 'رقم الطالب' }, { key: 'trainingType', label: 'النمط' }, { key: 'id', label: 'رصد', render: (row) => <button onClick={() => { setSelected(row); setGrades(row.fieldTrainingGrades || {}); }}>رصد الدرجات</button> }]} />;
  const save = () => { update({ ...selected, fieldTrainingGrades: grades }); setSelected(null); };
  return <section className="panel"><div className="panel-head"><h2>رصد درجات {selected.name}</h2><button onClick={() => setSelected(null)}>رجوع</button></div>{trainings.map((training) => <div key={training.id} className="grade-row"><strong>{training.name}</strong>{['visit1','visit2','principal','teacher','supervisorEval','assignments','recordedLessons'].map((field) => <label key={field}>{field}<input type="number" value={grades?.[training.id]?.[field] || 0} onChange={(e) => setGrades((prev) => ({ ...prev, [training.id]: { ...(prev[training.id] || {}), [field]: Number(e.target.value) } }))} /></label>)}</div>)}<button className="primary" onClick={save}>حفظ الدرجات</button></section>;
}

export default App;
