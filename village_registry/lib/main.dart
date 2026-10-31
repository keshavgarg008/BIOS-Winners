import 'package:cloud_firestore/cloud_firestore.dart';   // NEW
import 'package:firebase_auth/firebase_auth.dart';        // NEW
import 'session.dart';                                     // NEW
import 'sync_service.dart';                                // NEW

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // NEW: our own SQLite queue is the offline store; avoid a second hidden queue
  FirebaseFirestore.instance.settings =
      const Settings(persistenceEnabled: false);

  await Session.init(); // NEW

  // NEW: starts/stops sync automatically on login/logout (no UI changes needed)
  FirebaseAuth.instance.authStateChanges().listen((user) async {
    if (user == null) {
      SyncService.instance.stop();
      Session.clear();
    } else {
      await Session.load(user);
      SyncService.instance.start();
    }
  });

  runApp(const VillageRegistryApp());
}