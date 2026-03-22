# Mini Social (React + Firebase)

Messenger-like app where users can sign in, publish posts, and chat 1:1 (Facebook-style core flow).

## Features

- Sign in with Google or as guest
- Global feed where everyone can see posts
- Search people by name/email
- Friend requests (send, accept, decline)
- Suggested people list based on non-friends
- Direct 1:1 messaging with live updates

## Setup

1. Create a Firebase project: https://console.firebase.google.com/
2. Enable **Authentication**:
   - Google
   - Anonymous
3. Create **Firestore Database**.
4. In Firestore, create security rules (example below).

### Firestore security rules (example for this app)

Replace your rules with something like:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;

      match /friends/{friendId} {
        allow read: if request.auth != null
          && (request.auth.uid == userId || request.auth.uid == friendId);
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && resource.data.authorUid == request.auth.uid;
    }

    match /conversations/{conversationId} {
      allow read: if request.auth != null
        && request.auth.uid in resource.data.participantUids;
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.participantUids;
      allow update: if request.auth != null
        && request.auth.uid in resource.data.participantUids;

      match /messages/{messageId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(
            /databases/$(database)/documents/conversations/$(conversationId)
          ).data.participantUids;
      }
    }

    match /friendRequests/{requestId} {
      allow read: if request.auth != null
        && (request.auth.uid == resource.data.fromUid || request.auth.uid == resource.data.toUid);
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.fromUid;
      allow update, delete: if request.auth != null
        && (request.auth.uid == resource.data.fromUid || request.auth.uid == resource.data.toUid);
    }
  }
}
```

Data model used by the app:

- `users/{uid}` - public profile
- `posts/{postId}` - global feed posts
- `conversations/{uidA__uidB}` - chat metadata
- `conversations/{uidA__uidB}/messages/{messageId}` - chat messages
- `users/{uid}/friends/{friendUid}` - accepted friends
- `friendRequests/{requestId}` - pending requests

## Configure env vars

1. Copy `.env.example` to `.env`
2. Fill in the values from your Firebase project settings.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints.
