import 'package:flutter/material.dart';

void main() {
  runApp(const VillageRegistryApp());
}

class VillageRegistryApp extends StatelessWidget {
  const VillageRegistryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Village Health Registry',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.teal,
        scaffoldBackgroundColor: Colors.grey[100],
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Colors.teal,
          centerTitle: true,
        ),
      ),
      // App starts at the Offline PIN screen
      home: const OfflineLoginScreen(),
    );
  }
}

// ==========================================
// SCREEN 1: THE OFFLINE PIN LOCK
// ==========================================
class OfflineLoginScreen extends StatefulWidget {
  const OfflineLoginScreen({super.key});

  @override
  State<OfflineLoginScreen> createState() => _OfflineLoginScreenState();
}

class _OfflineLoginScreenState extends State<OfflineLoginScreen> {
  final TextEditingController _pinController = TextEditingController();
  bool _isLoading = false;

  void _verifyPin() async {
    setState(() => _isLoading = true);
    // Simulate local hash comparison delay
    await Future.delayed(const Duration(milliseconds: 500)); 
    
    if (_pinController.text == '1234') { // In production, compare with local hashed PIN
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const DashboardScreen()),
        );
      }
    } else {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid PIN. Try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.teal,
      body: Center(
        child: Card(
          margin: const EdgeInsets.all(32.0),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.security, size: 64, color: Colors.teal),
                const SizedBox(height: 16),
                const Text(
                  'Secure Offline Login',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Jalandhar District Health Worker',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _pinController,
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 4,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 8),
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'PIN',
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _verifyPin,
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                    child: _isLoading 
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Unlock Database', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// SCREEN 2: THE WORKER DASHBOARD
// ==========================================
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Village Patient Roster'),
        actions: [
          // Visual indicator that the app is running in offline mode
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Row(
              children: const [
                Icon(Icons.cloud_off, color: Colors.redAccent, size: 18),
                SizedBox(width: 8),
                Text('Offline Mode'),
              ],
            ),
          )
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 3, // Dummy data count
        itemBuilder: (context, index) {
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Colors.teal[100],
                child: const Icon(Icons.person, color: Colors.teal),
              ),
              title: Text('Student/Patient 00${index + 1}'),
              subtitle: const Text('Last synced: 2 days ago'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AddRecordScreen()),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Trigger the sync logic to push SQLite events to Firebase queue
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Searching for network to sync events...')),
          );
        },
        icon: const Icon(Icons.sync),
        label: const Text('Sync Queued Events'),
        backgroundColor: Colors.teal,
      ),
    );
  }
}

// ==========================================
// SCREEN 3: OFFLINE DATA ENTRY FORM
// ==========================================
class AddRecordScreen extends StatefulWidget {
  const AddRecordScreen({super.key});

  @override
  State<AddRecordScreen> createState() => _AddRecordScreenState();
}

class _AddRecordScreenState extends State<AddRecordScreen> {
  String _selectedVaccine = 'Measles-Rubella (MR)';

  void _saveOfflineEvent() {
    // Here is where you will call DatabaseHelper.instance.insertEvent()
    // passing the UUID, the selected vaccine, and the JSON payload.
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Event saved locally! Ready for background sync.'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Log Clinical Event'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Record New Vaccination',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'This data will be securely saved to the local SQLite log and uploaded when a connection is found.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 32),
            const Text('Select Vaccine Type', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade400),
                borderRadius: BorderRadius.circular(8),
                color: Colors.white,
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedVaccine,
                  isExpanded: true,
                  items: <String>['Measles-Rubella (MR)', 'Polio (OPV)', 'DPT Booster']
                      .map((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  }).toList(),
                  onChanged: (newValue) {
                    setState(() {
                      _selectedVaccine = newValue!;
                    });
                  },
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton.icon(
                onPressed: _saveOfflineEvent,
                icon: const Icon(Icons.save_alt),
                label: const Text('Commit Offline Event', style: TextStyle(fontSize: 18)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}