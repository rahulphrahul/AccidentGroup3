import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { deleteUser, getAllUsers, updateUser } from "../../service/apiservice";
import "./RegUser.css";

const RegUser = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Failed to load users");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await deleteUser(id);
    load();
  };

  const onRoleChange = async (user) => {
    const role = prompt("Role: citizen / ambulance / admin / super_admin", user.role);
    if (!role) return;
    await updateUser(user._id, { role });
    load();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return [u.name, u.email, u.phone, u.role].some((v) => String(v || "").toLowerCase().includes(q));
  });

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="brand">Admin</h2>
        <ul className="nav-list">
          <NavLink to="/admin" className="nav-item"><li>Overview</li></NavLink>
          <NavLink to="/admin/users" className="nav-item"><li>Users</li></NavLink>
        </ul>
      </aside>

      <div className="content-area">
        <header className="top-header"><h1>User Management</h1></header>
        <input
          className="search"
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {error && <p style={{ color: "#b00020" }}>{error}</p>}

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td>{u.role}</td>
                  <td>
                    <button onClick={() => onRoleChange(u)}>Change Role</button>
                    <button onClick={() => onDelete(u._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegUser;
