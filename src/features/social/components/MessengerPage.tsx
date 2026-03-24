import { useEffect, useRef, useState, useMemo } from 'react'
import { formatDate } from '../utils'
import type { AppUser, Message, Friend } from '../../../services/socialService'
import type { User } from 'firebase/auth'

interface MessengerPageProps {
  authUser: User | null
  people: AppUser[]
  friends: Friend[]
  activeChatUser: AppUser | null
  setActiveChatUser: (user: AppUser | null) => void
  messages: Message[]
  messageText: string
  setMessageText: (val: string) => void
  onSendMessage: () => void
  onUnsendEveryone: (messageId: string) => void
  onUnsendForMe: (messageId: string) => void
  onViewProfile: (uid: string) => void
}

export function MessengerPage({
  authUser,
  people,
  friends,
  activeChatUser,
  setActiveChatUser,
  messages,
  messageText,
  setMessageText,
  onSendMessage,
  onUnsendEveryone,
  onUnsendForMe,
  onViewProfile,
}: MessengerPageProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [messengerSearch, setMessengerSearch] = useState('')
  const [unsendModalMsg, setUnsendModalMsg] = useState<Message | null>(null)
  const [unsendOption, setUnsendOption] = useState<'everyone' | 'me'>('everyone')

  const filteredPeople = useMemo(() => {
    const q = messengerSearch.toLowerCase().trim()
    if (!q) return people
    return people.filter(p => 
      p.displayName.toLowerCase().includes(q) || 
      p.email.toLowerCase().includes(q)
    )
  }, [people, messengerSearch])

  // Helper to safely set active user from a Friend or AppUser
  const handleSetActive = (u: any) => {
    // If it's a Friend object, we might want to find the full AppUser in 'people'
    const fullUser = people.find(p => p.uid === u.uid) || (u as AppUser)
    setActiveChatUser(fullUser)
  }

  const prevMsgCount = useRef(messages.length)

  useEffect(() => {
    if (chatEndRef.current && messages.length > prevMsgCount.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    prevMsgCount.current = messages.length
  }, [messages])

  if (!authUser) {
    return <div className="messengerEmpty">Please sign in to use Messenger.</div>
  }

  return (
    <div className="messengerPage">
      {/* Column 1: Conversations List */}
      <div className="messengerSidebar">
        <div className="sidebarHeader">
          <h2>Chats</h2>
          <div className="sidebarActions">
            <button className="iconBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v5h-2v-5H7v-2h4V7h2v5h4v2z"/></svg>
            </button>
          </div>
        </div>
        <div className="sidebarSearch">
          <div className="searchWrapper">
            <span className="searchIcon">🔍</span>
            <input 
              type="text" 
              placeholder="Search Messenger" 
              value={messengerSearch}
              onChange={(e) => setMessengerSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Friends Strip - Horizontal */}
        {friends.length > 0 && (
          <div className="friendsStrip sidebar">
            {friends.map(f => (
              <div key={f.uid} className="friendStripItem" onClick={() => handleSetActive(f)}>
                <div className="avatarWrapper">
                  <img 
                    src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`} 
                    alt={f.displayName} 
                    className="avatarSmall" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="statusIndicator online"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="conversationList">
          {filteredPeople.length === 0 ? (
            <div className="sidebarEmpty">No results found.</div>
          ) : (
            filteredPeople.map(p => (
              <div 
                key={p.uid} 
                className={`conversationItem ${activeChatUser?.uid === p.uid ? 'active' : ''}`}
                onClick={() => handleSetActive(p)}
              >
                <div className="avatarWrapper">
                  <img 
                    src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} 
                    alt={p.displayName} 
                    className="avatarMedium" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="statusIndicator online"></div>
                </div>
                <div className="conversationInfo">
                  <div className="conversationName">{p.displayName}</div>
                  <div className="conversationLastMsg">Click to start chatting</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Column 2: Chatbox */}
      <div className="messengerChatMain">
        {activeChatUser ? (
          <>
            <div className="chatHeader">
              <div className="chatHeaderLeft" onClick={() => onViewProfile(activeChatUser.uid)}>
                <img 
                  src={activeChatUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser.displayName)}`} 
                  alt={activeChatUser.displayName} 
                  className="avatarSmall" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="chatHeaderName">{activeChatUser.displayName}</div>
                  <div className="chatHeaderStatus">Active now</div>
                </div>
              </div>
              <div className="chatHeaderActions">
                <button className="iconBtn"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5V6h14v12z"/></svg></button>
                <button className="iconBtn"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></button>
              </div>
            </div>

            <div className="chatMessages">
              {messages.length === 0 ? (
                <div className="chatWelcome">
                  <img 
                    src={activeChatUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser.displayName)}`} 
                    alt="" 
                    className="avatarLarge" 
                    referrerPolicy="no-referrer"
                  />
                  <h3>{activeChatUser.displayName}</h3>
                  <p>You're friends on Miny Social</p>
                  <button className="secondary" onClick={() => onViewProfile(activeChatUser.uid)}>View Profile</button>
                </div>
              ) : (
                messages
                  .filter(m => !m.unsentFor?.includes(authUser.uid))
                  .map((m, index, filteredMsgs) => {
                    const isMine = m.fromUid === authUser.uid
                    const showAvatar = index === 0 || filteredMsgs[index - 1].fromUid !== m.fromUid
                    
                    return (
                      <div key={m.id} className={`messageWrapper ${isMine ? 'mine' : 'theirs'} ${showAvatar ? 'withAvatar' : ''} ${m.isUnsent ? 'isUnsent' : ''}`}>
                        {!isMine && showAvatar && (
                          <img 
                            src={m.fromPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fromName)}`} 
                            alt="" 
                            className="avatarXSmall" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {!isMine && !showAvatar && <div className="avatarSpacer"></div>}
                        <div className="messageBubble">
                          <div className="messageText">
                            {m.isUnsent ? (isMine ? 'You unsent a message' : `${m.fromName} unsent a message`) : m.text}
                          </div>
                          {!m.isUnsent && (
                            <div className="messageTime">{formatDate(m.createdAtMs)}</div>
                          )}
                        </div>
                        {!m.isUnsent && (
                          <button 
                            className="messageMenuBtn"
                            onClick={() => {
                              setUnsendModalMsg(m)
                              setUnsendOption(isMine ? 'everyone' : 'me')
                            }}
                            title="Message Options"
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                              <circle cx="10" cy="4" r="2" />
                              <circle cx="10" cy="10" r="2" />
                              <circle cx="10" cy="16" r="2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chatInputArea">
              <div className="chatInputMain">
                <div className="chatActionsFloating">
                  <button className="floatingActionBtn"><span className="icon">➕</span></button>
                  <button className="floatingActionBtn"><span className="icon">�️</span></button>
                  <button className="floatingActionBtn"><span className="icon">🎙️</span></button>
                </div>
                <div className="chatInputWrapper">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && messageText.trim()) onSendMessage()
                    }}
                  />
                  <button className="emojiBtn">😀</button>
                </div>
                <button 
                  className={`sendBtnModern ${messageText.trim() ? 'active' : ''}`}
                  onClick={onSendMessage}
                  disabled={!messageText.trim()}
                >
                  <div className="sendIconWrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="noChatSelected">
            <div className="noChatContent">
              <div className="noChatIcon">💬</div>
              <h3>No chat selected</h3>
              <p>Select a person from the left or your friends below to start a conversation.</p>
              
              {friends.length > 0 && (
                <div className="friendsStrip noChat">
                  {friends.map(f => (
                    <div key={f.uid} className="friendStripItem" onClick={() => handleSetActive(f)}>
                      <div className="avatarWrapper">
                        <img 
                          src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`} 
                          alt={f.displayName} 
                          className="avatarMedium" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="statusIndicator online"></div>
                      </div>
                      <span className="friendStripName">{f.displayName.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Profile Info (Desktop Only) */}
      <div className="messengerProfileRail">
        {activeChatUser ? (
          <div className="profileRailContent">
            <div className="profileRailHeader">
              <img 
                src={activeChatUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser.displayName)}`} 
                alt="" 
                className="avatarLarge" 
                referrerPolicy="no-referrer"
              />
              <h3>{activeChatUser.displayName}</h3>
              <div className="statusText">Active now</div>
            </div>
            
            <div className="profileRailActions">
              <button className="railActionBtn" onClick={() => onViewProfile(activeChatUser.uid)}>
                <div className="iconCircle">👤</div>
                <span>Profile</span>
              </button>
              <button className="railActionBtn">
                <div className="iconCircle">🔔</div>
                <span>Mute</span>
              </button>
              <button className="railActionBtn">
                <div className="iconCircle">🔍</div>
                <span>Search</span>
              </button>
            </div>

            <div className="profileRailSections">
              <div className="railSection">
                <div className="railSectionHeader">Chat Info</div>
                <div className="railSectionItem">
                  <span>Theme</span>
                  <div className="themeCircle"></div>
                </div>
                <div className="railSectionItem">
                  <span>Emoji</span>
                  <span>👍</span>
                </div>
                <div className="railSectionItem">
                  <span>Nicknames</span>
                  <span className="icon">›</span>
                </div>
              </div>

              <div className="railSection">
                <div className="railSectionHeader">Media, Files & Links</div>
                <div className="mediaGrid">
                  <div className="mediaPlaceholder"></div>
                  <div className="mediaPlaceholder"></div>
                  <div className="mediaPlaceholder"></div>
                </div>
                <button className="textLink">View all media</button>
              </div>

              <div className="railSection">
                <div className="railSectionHeader">Privacy & Support</div>
                <div className="railSectionItem danger">
                  <span>Block</span>
                  <span className="icon">🚫</span>
                </div>
                <div className="railSectionItem danger">
                  <span>Report</span>
                  <span className="icon">⚠️</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="profileRailEmpty">
            <p>Select a user to view their profile information.</p>
          </div>
        )}
      </div>

      {/* Unsend Modal */}
      {unsendModalMsg && (
        <div className="modalOverlay unsendModal">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Who do you want to unsend this message for?</h3>
            </div>
            <div className="modalBody">
              {unsendModalMsg.fromUid === authUser?.uid && (
                <div className={`unsendOption ${unsendOption === 'everyone' ? 'active' : ''}`} onClick={() => setUnsendOption('everyone')}>
                  <div className="optionRadio"></div>
                  <div className="optionInfo">
                    <div className="optionTitle">Unsend for everyone</div>
                    <div className="optionDesc">This message will be unsent for everyone in the chat. Others may have already seen or forwarded it. Unsent messages can still be included in reports.</div>
                  </div>
                </div>
              )}
              <div className={`unsendOption ${unsendOption === 'me' ? 'active' : ''}`} onClick={() => setUnsendOption('me')}>
                <div className="optionRadio"></div>
                <div className="optionInfo">
                  <div className="optionTitle">Unsend for you</div>
                  <div className="optionDesc">This will remove the message from your devices. Other chat members will still be able to see it.</div>
                </div>
              </div>
            </div>
            <div className="modalFooter">
              <button className="textBtn" onClick={() => setUnsendModalMsg(null)}>Cancel</button>
              <button className="primaryBtn" onClick={() => {
                if (unsendOption === 'everyone') onUnsendEveryone(unsendModalMsg.id)
                else onUnsendForMe(unsendModalMsg.id)
                setUnsendModalMsg(null)
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
