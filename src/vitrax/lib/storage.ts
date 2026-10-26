// @ts-nocheck
import { StudyPack, DocumentItem, Conversation, CodeProject } from '../types';

export const DEFAULT_PROJECTS: CodeProject[] = [
  {
    id: 'proj-study-planner',
    name: 'Study & Task Planner Pro',
    description: 'A responsive full-featured study planner with interactive calendar, task prioritization, countdown timers, and productivity metrics.',
    activeFile: 'App.tsx',
    updatedAt: Date.now() - 3600000,
    files: {
      'App.tsx': `import React, { useState } from 'react';
import { Calendar, CheckSquare, Clock, Plus, Trash2, Award } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Complete Quantum Physics Problem Set 4', subject: 'Physics', dueDate: 'Tomorrow', completed: false, priority: 'High' },
    { id: '2', title: 'Review Graph Algorithms & Dijkstra', subject: 'Computer Science', dueDate: 'Friday', completed: true, priority: 'Medium' },
    { id: '3', title: 'Read Chapter 6: Cell Membrane Potentials', subject: 'Biochemistry', dueDate: 'Sunday', completed: false, priority: 'Low' },
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('STEM');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setTasks([...tasks, {
      id: Date.now().toString(),
      title: newTitle.trim(),
      subject: newSubject,
      dueDate: 'Today',
      completed: false,
      priority: newPriority,
    }]);
    setNewTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-teal-400 w-6 h-6" />
              VITRAX Study Planner
            </h1>
            <p className="text-xs text-slate-400 mt-1">Organize courses, deadlines, and study sprints</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Award className="text-amber-400 w-4 h-4" />
            <span>Progress: <strong className="text-teal-300">{completedCount}/{tasks.length} Done</strong></span>
          </div>
        </header>

        {/* Task Form */}
        <form onSubmit={addTask} className="flex gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <input
            type="text"
            placeholder="Add a new study session or assignment..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="flex-1 bg-transparent px-3 text-sm text-white focus:outline-none placeholder-slate-500"
          />
          <select 
            value={newPriority} 
            onChange={e => setNewPriority(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-300"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button type="submit" className="bg-teal-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-teal-400 transition-colors flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>

        {/* Task List */}
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleTask(task.id)} className="text-slate-400 hover:text-teal-400">
                  <CheckSquare className={\`w-5 h-5 \${task.completed ? 'text-teal-400 fill-teal-400/20' : ''}\`} />
                </button>
                <div>
                  <p className={\`text-sm font-medium \${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}\`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="text-teal-400">{task.subject}</span>
                    <span>• Due: {task.dueDate}</span>
                    <span className={\`px-1.5 py-0.2 rounded \${task.priority === 'High' ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800 text-slate-400'}\`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-rose-400 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Study Planner Pro</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100">
  <div id="root"></div>
</body>
</html>`,
      'package.json': `{
  "name": "study-planner-pro",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "lucide-react": "^0.546.0"
  }
}`
    }
  }
];

export const DEFAULT_STUDY_PACKS: StudyPack[] = [
  {
    id: 'pack-quantum-physics',
    title: 'Quantum Mechanics & Wave Equations',
    summary: 'Comprehensive high-yield notes on Schrödinger wave equation, Heisenberg uncertainty principle, and square potential wells.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    keyFormulas: [
      {
        name: "Time-Independent Schrödinger Equation",
        formula: "-\\frac{\\hbar^2}{2m} \\nabla^2 \\psi + V(\\mathbf{r})\\psi = E\\psi",
        meaning: "Describes spatial probability amplitude distribution of quantum particles in potential V(r)."
      },
      {
        name: "Heisenberg Uncertainty Principle",
        formula: "\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}",
        meaning: "Fundamental precision limit for complementary pairs of physical observables."
      }
    ],
    flashcards: [
      {
        id: 'qc-1',
        topic: 'Quantum Mechanics',
        front: 'What is the physical interpretation of the square magnitude |ψ(x,t)|²?',
        back: 'Max Born probability density: probability of finding particle within [x, x + dx] at time t.',
        hint: 'Think of Max Born.',
        difficulty: 'Easy',
        state: 'known'
      },
      {
        id: 'qc-2',
        topic: 'Quantum Operators',
        front: 'What does a non-zero commutator [A, B] = AB - BA ≠ 0 imply?',
        back: 'Observables are mutually incompatible and cannot share a simultaneous eigenbasis.',
        hint: 'Simultaneous eigenstates.',
        difficulty: 'Medium',
        state: 'new'
      }
    ],
    quiz: [
      {
        id: 'qq-1',
        question: 'An electron is confined to a 1D box of length L. If the length is halved to L/2, what happens to the ground-state energy E₁?',
        options: ['It is halved (E₁ / 2)', 'It doubles (2 E₁)', 'It quadruples (4 E₁)', 'It remains unchanged'],
        correctIndex: 2,
        explanation: 'E_n ∝ 1/L². Halving L results in (1 / (1/2)²) = 4 times original energy.',
        hint: 'Examine E = n²h²/(8mL²).'
      }
    ]
  }
];

export const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-quantum-physics',
    title: 'Quantum_Physics_Final_Exam.pdf',
    type: 'exam',
    size: '1.4 MB',
    uploadedAt: Date.now() - 1000 * 60 * 60 * 8,
    questionsDetected: 14,
    content: `EXAMINATION: ADVANCED QUANTUM MECHANICS
Problem 1: Particle in a Finite Potential Well
(a) Write boundary conditions for wave function ψ(x) and its derivative ψ'(x) at x = ±a.
(b) Derive transcendental equation for even parity bound state energies.
(c) Prove there is always at least one bound state.`
  }
];

const CONVERSATIONS_KEY = 'vitrax_conversations_v2';
const PROJECTS_KEY = 'vitrax_projects_v2';
const STUDY_PACKS_KEY = 'vitrax_study_packs_v2';
const DOCUMENTS_KEY = 'vitrax_documents_v2';

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (e) {
    console.error('Failed to save conversations', e);
  }
}

export function loadProjects(): CodeProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveProjects(projects: CodeProject[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects', e);
  }
}

export function loadStudyPacks(): StudyPack[] {
  try {
    const raw = localStorage.getItem(STUDY_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveStudyPacks(packs: StudyPack[]) {
  try {
    localStorage.setItem(STUDY_PACKS_KEY, JSON.stringify(packs));
  } catch (e) {
    console.error('Failed to save study packs', e);
  }
}

export function loadDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveDocuments(docs: DocumentItem[]) {
  try {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save documents', e);
  }
}
