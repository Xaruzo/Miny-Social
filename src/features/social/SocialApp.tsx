import { auth, db } from '../../firebase'
import { useSocialController } from './hooks/useSocialController'
import { CreatePostModal } from './components/CreatePostModal'
import { PostItem } from './components/PostItem'
import { MessengerPage } from './components/MessengerPage'

export default function SocialApp() {
  const {
    authUser,
    people,
    friends,
    incomingRequests,
    activeChatUser,
    setActiveChatUser,
    messages,
    onUnsendEveryone,
    onUnsendForMe,
    peopleSearch,
    setPeopleSearch,
    postText,
    setPostText,
    postImageURL,
    setPostImageURL,
    postAspectRatio,
    setPostAspectRatio,
    messageText,
    setMessageText,
    selectedUser,
    setSelectedUser,
    isEditingBio,
    setIsEditingBio,
    bioText,
    setBioText,
    isUploading,
    busy,
    error,
    showSearchResults,
    setShowSearchResults,
    showProfileMenu,
    setShowProfileMenu,
    showCreatePostModal,
    setShowCreatePostModal,
    isDarkMode,
    setIsDarkMode,
    playingVideoId,
    setPlayingVideoId,
    currentPage,
    setCurrentPage,
    menuRef,
    fileInputRef,
    displayName,
    friendUidSet,
    visiblePeople,
    postsToShow,
    suggestedPeople,
    onGoogleLogin,
    onGuestLogin,
    onPost,
    onToggleLike,
    onAddComment,
    onUpdateBio,
    handleFileChange,
    handleDragOver,
    handleDrop,
    onViewProfile,
    onAddFriend,
    onAcceptRequest,
    onRejectRequest,
    onSendMessage,
    onLogout,
  } = useSocialController()

  if (!auth || !db) {
    return (
      <div className="socialShell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
        <h1>⚠️ Configuration Missing</h1>
        <p>Firebase environment variables are not set. Please create an <strong>.env</strong> file in the root directory using <strong>.env.example</strong> as a template.</p>
        <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'left', maxWidth: '500px' }}>
          <code>
            VITE_FIREBASE_API_KEY=your_key<br/>
            VITE_FIREBASE_AUTH_DOMAIN=...<br/>
            VITE_FIREBASE_PROJECT_ID=...
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className={`socialShell ${isDarkMode ? 'dark' : ''}`}>
      <header className="fbTopbar">
        <div className="topbarLeft">
          <div className="socialTitle" onClick={() => { setSelectedUser(null); setCurrentPage('feed'); }} style={{ cursor: 'pointer' }}>Miny Social</div>
          <div className="searchContainer">
            <input
              className="searchBar"
              value={peopleSearch}
              onChange={(e) => {
                setPeopleSearch(e.target.value)
                setShowSearchResults(true)
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search people"
              disabled={!authUser}
            />
            {showSearchResults && visiblePeople.length > 0 && (
              <div className="searchResults">
                {visiblePeople.map((p) => (
                  <button
                    key={p.uid}
                    className="searchResultItem"
                    onClick={() => {
                      setSelectedUser(p);
                      setCurrentPage('feed');
                      setPeopleSearch('');
                      setShowSearchResults(false);
                    }}
                  >
                    <img 
                      src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} 
                      alt={p.displayName} 
                      className="avatarXSmall" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="networkItemInfo">
                      <div className="personName">{p.displayName}</div>
                      <div className="hint">{p.email}</div>
                    </div>
                    <button 
                      className="iconBtn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveChatUser(p);
                        setCurrentPage('messenger');
                        setPeopleSearch('');
                        setShowSearchResults(false);
                      }}
                      title="Message"
                    >
                      💬
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!authUser ? (
          <div className="topbarActions">
            <button className="primary" disabled={busy} onClick={onGoogleLogin}>
              Sign in with Google
            </button>
            <button disabled={busy} onClick={onGuestLogin}>
              Continue as Guest
            </button>
          </div>
        ) : (
          <div className="topbarActions" ref={menuRef}>
            <div className="userBadge" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <img 
                src={authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`} 
                alt={displayName} 
                className="avatarXSmall" 
                referrerPolicy="no-referrer"
              />
              <span>{displayName}</span>
            </div>
            
            {showProfileMenu && (
              <div className="profileDropdown">
                <div className="dropdownHeader">
                  <div className="networkItemName">{displayName}</div>
                  <div className="networkItemSub">{authUser.email}</div>
                </div>
                
                <button 
                  className="dropdownItem" 
                  onClick={() => {
                    onViewProfile(authUser.uid);
                    setCurrentPage('feed');
                    setShowProfileMenu(false);
                  }}
                >
                  👤 View Profile
                </button>
                
                <div className="dropdownDivider"></div>
                
                <div className="dropdownItem" onClick={() => setIsDarkMode(!isDarkMode)}>
                  <div className="toggleWrapper">
                    <span>🌙 Dark Mode</span>
                    <label className="toggleSwitch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isDarkMode} 
                        onChange={(e) => setIsDarkMode(e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="dropdownDivider"></div>
                
                <button className="dropdownItem" onClick={onLogout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      {currentPage === 'messenger' ? (
        <MessengerPage 
          authUser={authUser}
          people={people}
          friends={friends}
          activeChatUser={activeChatUser}
          setActiveChatUser={setActiveChatUser}
          messages={messages}
          messageText={messageText}
          setMessageText={setMessageText}
          onSendMessage={onSendMessage}
          onUnsendEveryone={onUnsendEveryone}
          onUnsendForMe={onUnsendForMe}
          onViewProfile={(uid) => { onViewProfile(uid); setCurrentPage('feed'); }}
        />
      ) : (
        <main className="fbLayout">
          <section className="leftRail">
            <h2 className="cardTitle">Navigation</h2>
            <div className="networkList">
              <button 
                className={`navItem ${!selectedUser ? 'active' : ''}`}
                onClick={() => { setCurrentPage('feed'); setSelectedUser(null); }}
              >
                <span className="navIcon">🏠</span> Feed
              </button>
              <button 
                className="navItem"
                onClick={() => setCurrentPage('messenger')}
              >
                <span className="navIcon">💬</span> Messenger
              </button>
            </div>

            <h3 className="sectionTitle">Friends</h3>
          {friends.length === 0 ? (
            <div className="hint">No friends yet.</div>
          ) : (
            <div className="networkList">
              {friends.map((f) => (
                <div key={f.uid} className="networkItem" onClick={() => onViewProfile(f.uid)}>
                  <img 
                    src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`} 
                    className="avatarSmall" 
                    alt={f.displayName} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="networkItemInfo">
                    <div className="networkItemName">{f.displayName}</div>
                    <div className="networkItemSub">Friend</div>
                  </div>
                  <button 
                    className="iconBtn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const user = people.find(p => p.uid === f.uid);
                      if (user) setActiveChatUser(user);
                      setCurrentPage('messenger');
                    }}
                    title="Message"
                  >
                    💬
                  </button>
                </div>
              ))}
            </div>
          )}

          <h3 className="sectionTitle">Suggested People</h3>
          {suggestedPeople.length === 0 ? (
            <div className="hint">No suggestions.</div>
          ) : (
            <div className="networkList">
              {suggestedPeople.map((p) => (
                <div key={p.uid} className="networkItem">
                  <img 
                    src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} 
                    className="avatarSmall" 
                    alt={p.displayName}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewProfile(p.uid)}
                    referrerPolicy="no-referrer"
                  />
                  <div className="networkItemInfo">
                    <div 
                      className="networkItemName" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewProfile(p.uid)}
                    >
                      {p.displayName}
                    </div>
                    <div className="row" style={{ marginTop: '4px', gap: '0.5rem' }}>
                      <button 
                        className="primary" 
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => onAddFriend(p)}
                      >
                        Add Friend
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="centerFeed">
          {selectedUser ? (
            <div className="profileView">
              <div className="profileCover"></div>
              <div className="profileHeaderInfo">
                <div className="profileAvatarWrapper">
                  <img 
                    src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.displayName)}`} 
                    alt={selectedUser.displayName} 
                    className="avatarLarge" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="profileName">{selectedUser.displayName}</h2>
                <div className="profileBio">
                  {selectedUser.bio || "No bio yet."}
                </div>
                
                <div className="profileActions">
                  {authUser?.uid === selectedUser.uid ? (
                    isEditingBio ? (
                      <div className="row">
                        <input
                          type="text"
                          className="inputLine"
                          placeholder="Tell us about yourself..."
                          value={bioText}
                          onChange={(e) => setBioText(e.target.value)}
                        />
                        <button className="primary" onClick={onUpdateBio}>Save</button>
                        <button onClick={() => setIsEditingBio(false)}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => {
                        setIsEditingBio(true)
                        setBioText(selectedUser.bio || '')
                      }}>Edit Bio</button>
                    )
                  ) : (
                    <>
                      {friendUidSet.has(selectedUser.uid) ? (
                        <button disabled>Friends</button>
                      ) : (
                        <button className="primary" onClick={() => onAddFriend(selectedUser)}>Add Friend</button>
                      )}
                      <button onClick={() => { setActiveChatUser(selectedUser); setCurrentPage('messenger'); }}>Message</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {!authUser ? (
                <div className="hint">Sign in to post.</div>
              ) : (
                <>
                  <div 
                    className="composerTriggerCard" 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="composerTriggerRow">
                      <img 
                        src={authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`} 
                        className="avatarSmall" 
                        alt={displayName} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => onViewProfile(authUser.uid)}
                        referrerPolicy="no-referrer"
                      />
                      <div className="composerTriggerInput" onClick={() => setShowCreatePostModal(true)}>
                        What's on your mind, {displayName.split(' ')[0]}?
                      </div>
                    </div>
                  <div className="composerTriggerDivider" />
                  <div className="composerTriggerActions">
                    <button className="composerTriggerBtn" onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}>
                      <span className="icon">🖼️</span> Photo/Video
                    </button>
                      <button className="composerTriggerBtn">
                        <span className="icon">👥</span> Tag Friends
                      </button>
                      <button className="composerTriggerBtn">
                        <span className="icon">😊</span> Feeling/Activity
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                  />
                </>
              )}

              <CreatePostModal
                isOpen={showCreatePostModal}
                onClose={() => setShowCreatePostModal(false)}
                authUser={authUser}
                isDarkMode={isDarkMode}
                postText={postText}
                setPostText={setPostText}
                postImageURL={postImageURL}
                setPostImageURL={setPostImageURL}
                postAspectRatio={postAspectRatio}
                setPostAspectRatio={setPostAspectRatio}
                isUploading={isUploading}
                fileInputRef={fileInputRef}
                onPost={onPost}
              />
            </>
          )}

          <h2 className="cardTitle centerFeedTitle">
            {selectedUser ? `${selectedUser.displayName}'s posts` : "Feed"}
          </h2>
          {postsToShow.length === 0 ? (
            <div className="hint">No posts yet.</div>
          ) : (
            <div className="list">
              {postsToShow.map((p) => (
                <PostItem
                  key={p.id}
                  post={p}
                  currentUser={authUser}
                  onToggleLike={onToggleLike}
                  onAddComment={onAddComment}
                  onViewProfile={onViewProfile}
                  isDarkMode={isDarkMode}
                  playingVideoId={playingVideoId}
                  setPlayingVideoId={setPlayingVideoId}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rightRail">
          <div className="card">
            <h2 className="cardTitle">Contacts</h2>
            <div className="networkList">
              {people.map(p => (
                <button key={p.uid} className="networkItem" onClick={() => { setActiveChatUser(p); setCurrentPage('messenger'); }}>
                  <img 
                    src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} 
                    className="avatarSmall" 
                    alt={p.displayName} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="networkItemInfo">
                    <div className="networkItemName">{p.displayName}</div>
                    <div className="networkItemSub">Online</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem', flexShrink: 0 }}>
            <h2 className="cardTitle">Friend Requests</h2>
            {incomingRequests.length === 0 ? (
              <div className="hint">No requests.</div>
            ) : (
              <div className="networkList">
                {incomingRequests.map((r) => (
                  <div key={r.id} className="networkItem">
                    <img 
                      src={r.fromPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fromName)}`} 
                      className="avatarSmall" 
                      alt={r.fromName}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewProfile(r.fromUid)}
                      referrerPolicy="no-referrer"
                    />
                    <div className="networkItemInfo">
                      <div className="networkItemName">{r.fromName}</div>
                      <div className="row" style={{ marginTop: '4px' }}>
                        <button className="primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => onAcceptRequest(r)}>Confirm</button>
                        <button style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => onRejectRequest(r.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      )}
    </div>
  )
}
