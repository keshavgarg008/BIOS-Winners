import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'firebase_options.dart';
import 'screens/login_screen.dart';
import 'theme/app_theme.dart';
import 'session.dart';
import 'sync_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Our own SQLite queue is the offline store, so turn off Firestore's hidden cache
  FirebaseFirestore.instance.settings =
      const Settings(persistenceEnabled: false);

  await Session.init();

  // Starts/stops sync automatically on login/logout
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

class VillageRegistryApp extends StatelessWidget {
  const VillageRegistryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Village Health Registry',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const LoginScreen(),
    );
  }
}