import React, { useState, useRef } from "react";
import "./UserProfile.css";

const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: ""
  });

  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);   // ✅ REF FOR GALLERY

  // Handle input change
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  // Open gallery
  const openGallery = () => {
    if (isEditing) {
      fileInputRef.current.click();   // ✅ OPENS GALLERY
    }
  };

  // Handle image selection
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="profile-container">

      {/* HEADER */}
      <div className="profile-header">
        <div className="back-btn">←</div>
        <h2>User Profile</h2>
      </div>

      {/* PROFILE CARD */}
      <div className="profile-card">

        {/* PROFILE IMAGE */}
        <div className="profile-image" onClick={openGallery}>
          {image ? (
            <img src={image} alt="Profile" className="avatar-img" />
          ) : (
            <div className="avatar">+</div>
          )}

          {/* Hidden input for gallery */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"     // ✅ GALLERY ACCESS
            onChange={handleImageUpload}
            hidden
          />
        </div>

        {/* PROFILE DETAILS */}
        <div className="profile-details">
          {["name", "email", "phone", "age", "gender"].map((field) => (
            <div className="detail" key={field}>
              <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>

              {isEditing ? (
                <input
                  type="text"
                  name={field}
                  value={profile[field]}
                  onChange={handleChange}
                />
              ) : (
                <p>{profile[field] || "__________"}</p>
              )}
            </div>
          ))}
        </div>

        {/* BUTTONS */}
        {!isEditing ? (
          <button className="edit-btn" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        ) : (
          <div className="btn-group">
            <button className="save-btn" onClick={() => setIsEditing(false)}>
              Save
            </button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default UserProfile;