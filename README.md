# 📝 To-Do List App

A fully functional To-Do List web application built with **React.js**, **Tailwind CSS**, and **Supabase**.  
Features include authentication, task creation with priority & deadlines, task editing, smooth scrolling, and expandable descriptions.

---

## 🚀 Features

- **User Authentication**
  - Sign up, login, and logout
  - Secure authentication with Supabase

- **Task Management**
  - Add, edit, delete tasks
  - Priority levels: High, Medium, Low
  - Task deadlines
  - Created-at timestamps

- **UI/UX**
  - Styled with Tailwind CSS
  - Smooth scrolling in the tasks section
  - "Read More / Read Less" for long descriptions

- **Responsive Design**
  - Works on desktop and mobile devices

---

## 📂 Project Structure
```
todo_app/
│── src/
│ ├── App.jsx # Main component
│ ├── App.css # App CSS styles
│ ├── main.jsx # Root component
│ ├── index.css # Root CSS styles
│── public/
│── index.html # Root
│── package-lock.json
│── package.json # Dependencies & scripts
│── README.md # Project documentation
│── vite.config.js # Vite + React Framework
```

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/todo-supabase.git
cd todo-supabase
```
### 2️⃣ Install Dependencies
```bash
npm install
```
### 3️⃣ Setup Tailwind CSS
```bash
https://tailwindcss.com/docs/installation/using-vite
```
### 4️⃣ Setup Supabase
- **Go to Supabase and create a new project.**

- **Create a table named tasks with columns:**

    - id (uuid, primary key, default uuid_generate_v4())

    - user_id (uuid)

    - title (text)

    - description (text)

    - priority (text)

    - deadline (date)

    - created_at (timestamp with timezone, default now())

- **Enable Row Level Security (RLS).**

- **Add policies so users can only access their own tasks.**

- **Copy your Supabase project URL and anon key into .env file:**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
### 5️⃣ Run the App
```bash
npm run dev
```
---
## 🔮 Future Improvements
- **Task search and filters**
- **Notifications for deadlines**
- **Drag-and-drop task reordering**
---
## 📜 License
**This project is licensed under the MIT License.**
