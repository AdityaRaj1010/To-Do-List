import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getInitialSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    }

    getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);


  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen min-w-screen bg-gradient-to-r from-blue-500 to-purple-500 text-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[99vh] bg-[hsl(163,65%,65%)] rounded-2xl shadow-lg overflow-hidden">
        <header className="flex items-center justify-between p-6 border-b">
          <h1 className="text-2xl font-semibold">📝 Smart To-Do</h1>
          <div className="flex items-center gap-3">
            {session ? (
              <UserMenu session={session} onSignOut={async () => { await supabase.auth.signOut(); }} />
            ) : (
              <div className="text-sm text-gray-500">Not signed in</div>
            )}
          </div>
        </header>

        <main className="p-6">
          {!session ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AuthCard mode="🔑 login" />
              <AuthCard mode="🆕 register" />
            </div>
          ) : (
            <Dashboard session={session} />
          )}
        </main>
      </div>
    </div>
  );
}

function UserMenu({ session, onSignOut }) {
  const user = session.user;
  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <div className="font-medium">{user.email}</div>
        {/* <div className="text-xs text-gray-500">{user.id}</div> */}
      </div>
      <button
        onClick={onSignOut}
        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Sign out
      </button>
    </div>
  );
}

function AuthCard({ mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleSubmit(e) {
    e?.preventDefault();
    setLoading(true);
    setNotice('');
    try {
      if (mode === '🆕 register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice('Registration successful. Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setNotice('Login successful!');
      }

      // setEmail('');
      // setPassword('');
    } catch (err) {
      setNotice(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl border">
      <h2 className="text-lg font-medium mb-3">{mode === '🆕 register' ? 'Create account' : '🔑 Login'}</h2>
      <label className="block text-sm mb-2">Email</label>
      <input
        type="email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
        className="w-full mb-3 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      <label className="block text-sm mb-2">Password</label>
      <input
        type="password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-800"
        >
          {loading ? 'Please wait...' : mode === '🆕 register' ? '🆕 Register' : '🔑 Login'}
        </button>
        <button
          type="button"
          onClick={async () => {
            // passwordless magic link
            if (!email) return setNotice('Enter email for magic link');
            setLoading(true);
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) setNotice(error.message);
            else setNotice('Magic link sent to your email');
            setLoading(false);
          }}
          className="text-sm text-indigo-400"
        >
          Send magic link
        </button>
      </div>

      {notice && <p className="mt-3 text-sm text-red-600">{notice}</p>}
    </form>
  );
}

function Dashboard({ session }) {
  const userId = session.user.id;
  const [tasks, setTasks] = useState([]);
  const [showFull, setShowFull] = useState({});
  const tasksContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | completed
  const [editor, setEditor] = useState({ open: false, task: null });

  useEffect(() => {
    fetchTasks();
    const realtime = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        // Simple re-fetch on any change - could be optimized
        fetchTasks();
      })
      .subscribe();

    if (tasksContainerRef.current) {
      tasksContainerRef.current.scrollTo({
        top: tasksContainerRef.current.scrollHeight,
        behavior: "smooth", // smooth scroll
      });
    }

    return () => { supabase.removeChannel(realtime); };

  }, []); // if needed, add [fetchtasks]



  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*");

    console.log("Fetched tasks:", data, error);

    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      setTasks(data);
      setLoading(false);
    }
  };


  async function addTask(payload) {
    const newTask = {
      id: uuidv4(),
      user_id: userId,
      title: payload.title,
      description: payload.description || '',
      completed: false
    };
    // optimistic UI
    setTasks(prev => [newTask, ...prev]);
    const { error } = await supabase.from('tasks').insert(newTask);
    if (error) {
      console.error(error);
      // revert
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
    }
  }

  async function updateTask(id, changes) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    const { error } = await supabase.from('tasks').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { console.error(error); fetchTasks(); }
  }

  async function deleteTask(id) {
    const confirmed = confirm('Delete this task?');
    if (!confirmed) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { console.error(error); fetchTasks(); }
  }

  const filtered = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  }).filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || (t.description || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full">
          <input
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-xl ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>All</button>
            <button onClick={() => setFilter('active')} className={`px-3 py-2 rounded-xl ${filter === 'active' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Active</button>
            <button onClick={() => setFilter('completed')} className={`px-3 py-2 rounded-xl ${filter === 'completed' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Done</button>
          </div>
        </div>
        <div>
          <button onClick={() => setEditor({ open: true, task: null })} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl">+ New Task</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border p-4 overflow-hidden">
            <h3 className="font-medium mb-3">Tasks</h3>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div
                className="max-h-[400px] overflow-y-auto pr-2 hide-scrollbar"
                ref={tasksContainerRef} // scroll container reference 
              >
                <ul className="space-y-3">
                  {filtered.length === 0 && (
                    <li className="text-sm text-gray-500">No tasks found.</li>
                  )}
                  {filtered.map((task) => {
                    const showFullForTask = showFull[task.id] || false;
                    const shortDescription =
                      task.description.length > 80
                        ? task.description.slice(0, 80) + "..."
                        : task.description;

                    return (
                      <li
                        key={task.id}
                        className="flex items-start gap-3 justify-between p-3 border rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() =>
                              updateTask(task.id, { completed: !task.completed })
                            }
                            className="mt-1"
                          />
                          <div>
                            <div
                              className={`font-medium ${task.completed ? "line-through text-gray-400" : ""
                                }`}
                            >
                              {task.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {showFullForTask ? task.description : shortDescription}
                              {task.description.length > 80 && (
                                <div
                                  onClick={() =>
                                    setShowFull((prev) => ({
                                      ...prev,
                                      [task.id]: !showFullForTask,
                                    }))
                                  }
                                  className="ml-1 text-blue-500 hover:underline text-xs bg-white cursor-pointer"
                                >
                                  {showFullForTask ? "Read Less" : "Read More"}
                                </div>
                              )}
                            </div>
                            <div className='flex items-center gap-1'>
                              <span className="text-xs text-gray-400 mt-1">
                                Created: {new Date(task.inserted_at).toLocaleString()}
                              </span>|
                              <span className="text-xs text-gray-500 mt-1">
                                Priority: <span className={
                                  task.priority === "high" ? "text-red-500 font-semibold" :
                                    task.priority === "medium" ? "text-yellow-500 font-semibold" :
                                      "text-green-500 font-semibold"
                                }>
                                  {task.priority}
                                </span>
                              </span>|
                              <span className="text-xs text-gray-500 mt-1">
                                Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditor({ open: true, task })}
                            className="px-3 py-1 border bg-indigo-600 text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="px-3 py-1 bg-red-500 text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </div>
        </div>

        <aside className="bg-white h-[40vh] border rounded-2xl p-4">
          <h3 className="font-medium mb-2">Overview</h3>
          <div className="text-sm text-gray-600">Total: <span className="font-semibold">{tasks.length}</span></div>
          <div className="text-sm text-gray-600">Completed: <span className="font-semibold">{tasks.filter(t => t.completed).length}</span></div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Quick actions</h4>
            <button className="mb-2 px-3 py-2 bg-yellow-400 block" onClick={() => {
              // mark all active as completed
              Promise.all(tasks.filter(t => !t.completed).map(t => updateTask(t.id, { completed: true })))
            }}>Mark all done</button>
            <button className="px-3 py-2 bg-gray-100" onClick={fetchTasks}>Refresh</button>
          </div>
        </aside>
      </div>

      {editor.open && (
        <TaskEditor
          task={editor.task}
          onClose={() => setEditor({ open: false, task: null })}
          onSave={async (payload) => {
            if (editor.task) {
              await updateTask(editor.task.id, payload);
            } else {
              await addTask(payload);
            }
            setEditor({ open: false, task: null });
          }}
        />
      )}
    </div>
  );
}

function TaskEditor({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      deadline,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">
            {task ? 'Edit Task' : 'Create Task'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700"
          >
            Close
          </button>
        </div>

        {/* Title */}
        <label className="block text-sm">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-3 px-3 py-2 border rounded-xl"
        />

        {/* Description */}
        <label className="block text-sm">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-3 px-3 py-2 border rounded-xl"
          rows={4}
        />

        {/* Priority */}
        <label className="block mt-3 text-sm">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border rounded-xl p-2 w-full"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Deadline */}
        <label className="block mt-3 text-sm">Deadline</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="border rounded-xl p-2 w-full"
        />

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
