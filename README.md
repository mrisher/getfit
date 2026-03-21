# Daily Fitness Routine App

A Next.js fitness application deployed on Google App Engine. It generates personalized daily 20-30 minute workouts choosing from an open-source database of exercises, filtered by available equipment.

## Features

- **Google Sign-In**: Secure user authentication.
- **Equipment Configuration**: Filter daily workouts by the equipment you own.
- **Smart Generation**: Dynamically builds a 5-exercise routine (3 sets x 10 reps as a baseline).
- **History & Feedback Tracking**: Adjusts your next session's difficulty based on your emoji feedback (😞 Too Hard, 😐 Good, 🤩 Too Easy).
- **Workout Execution UI**: Clean interface to advance through sets and track built-in rest periods.

---

## 🚀 Setup & Installation

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (which will also act as your Google Cloud project).
3. **Authentication**: Navigate to Authentication -> Sign-in method, and enable **Google**.
4. **Firestore Database**: Navigate to Firestore Database and click "Create database". Start in Test Mode or configure your security rules as follows:
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        match /routines/{routineId} {
          allow read, write: if request.auth != null && request.auth.uid == routineId.split("_")[0];
        }
        match /history/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
        }
      }
    }
    ```
5. **Register Web App**: Go to Project Settings -> General -> Your apps -> Add Web App. Copy the Firebase config object.

### 2. Environment Variables
Create a `.env.local` file in the root of the repository. Populate it with the keys from your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123:web:abc"
```

### 3. Local Development

First, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## ☁️ Deployment (Google App Engine)

This project is configured to automatically deploy to Google App Engine (Node.js 20 runtime) via GitHub Actions when code is merged into the `main` branch.

### Prerequisites for GitHub Actions
To allow GitHub Actions to deploy to your Google Cloud Project without long-lived service account keys, you must set up **Workload Identity Federation**.

Follow the [Google GitHub Actions Auth Guide](https://github.com/google-github-actions/auth) to configure it. You will need to create a Service Account with the `App Engine Admin` and `Storage Admin` roles.

### GitHub Secrets
Add the following secrets to your GitHub repository (Settings -> Secrets and variables -> Actions):

1. `GCP_PROJECT_ID`: Your Google Cloud / Firebase Project ID.
2. `WIF_PROVIDER`: The full identifier of your Workload Identity Provider. (e.g., `projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider`)
3. `WIF_SERVICE_ACCOUNT`: The email address of the service account you created. (e.g., `my-service-account@my-project.iam.gserviceaccount.com`)

### Manual Deployment
If you prefer to deploy manually using the Google Cloud CLI (`gcloud`), ensure you are logged in and run:

```bash
npm run build
gcloud app deploy
```
