-- ============================================================
-- LocalWala Academy - Production Seed File
-- Topic: Mobile Application Development using Flutter
-- Compatible with: Supabase / PostgreSQL
-- ============================================================
-- Contains:
--  1 Course | 5 Modules | 20 Lessons | 5 Module Quizzes (6 Q each = 30)
--  1 Final Assessment (30 unique questions)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

--------------------------------------------------------------
-- 1. COURSE
--------------------------------------------------------------
insert into academy_courses (
  id, title, slug, description, thumbnail_url,
  duration_minutes, difficulty, passing_score, is_published
) values (
  'a1000000-0000-0000-0000-000000000001',
  'LocalWala Academy: Mobile Application Development with Flutter',
  'localwala-academy-flutter-mobile-dev',
  'Build production-ready mobile applications from scratch using Flutter and Dart. This comprehensive course takes you from environment setup and Dart fundamentals through advanced UI, state management, backend integration with Supabase, and publishing to the App Store and Play Store — all through the lens of building the LocalWala hyperlocal commerce app.',
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200&auto=format&fit=crop&q=80',
  600,
  'intermediate',
  70,
  true
) on conflict (slug) do update set
  title         = excluded.title,
  description   = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  duration_minutes = excluded.duration_minutes,
  difficulty    = excluded.difficulty,
  passing_score = excluded.passing_score,
  is_published  = excluded.is_published;

--------------------------------------------------------------
-- 2. MODULES (5)
--------------------------------------------------------------
insert into academy_modules (
  id, course_id, title, order_no
) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Getting Started with Flutter & Dart', 1),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Dart Language Mastery', 2),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Flutter UI & Widget Deep Dive', 3),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'State Management & Backend Integration', 4),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Testing, Deployment & Production Readiness', 5)
on conflict do nothing;

--------------------------------------------------------------
-- 3. LESSONS (20 total - 4 per module)
--------------------------------------------------------------
insert into academy_lessons (
  id, module_id, title, content_md, video_url, duration_minutes, order_no
) values

-- =====================================================
-- Module 1: Getting Started with Flutter & Dart
-- =====================================================
  (
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Introduction to Flutter & Why It Matters',
    '# Introduction to Flutter & Why It Matters

Welcome to the world of cross-platform mobile development!

## What is Flutter?
Flutter is Google''s open-source UI toolkit for building natively compiled applications for mobile, web, and desktop from a **single codebase**.

## Why Flutter?
- **Single codebase**: Write once, run on iOS and Android.
- **Hot Reload**: See changes instantly without losing app state.
- **Expressive UI**: Rich set of customizable widgets.
- **Native Performance**: Compiles to native ARM code, no JavaScript bridge.

## Flutter vs Other Frameworks
| Feature | Flutter | React Native | Native |
|---------|---------|-------------|--------|
| Language | Dart | JavaScript | Swift/Kotlin |
| Performance | Near-native | Good | Best |
| Hot Reload | ✅ | ✅ | Limited |
| Single Codebase | ✅ | ✅ | ❌ |

## How LocalWala Uses Flutter
LocalWala chose Flutter to ship a single codebase across iOS and Android, reducing development time by 40% while delivering a premium native feel.

> "Flutter lets you build beautiful, natively compiled applications in record time." — Google',
    null, 15, 1
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'Setting Up Your Development Environment',
    $$# Setting Up Your Development Environment

A proper setup is the foundation of productive Flutter development.

## Prerequisites
- **Operating System**: macOS, Windows, or Linux
- **Disk Space**: At least 2.8 GB (Flutter SDK alone)
- **Git**: Required for Flutter installation

## Step-by-Step Setup

### 1. Install Flutter SDK
```bash
# macOS / Linux
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"

# Windows — download from flutter.dev and add to PATH
```

### 2. Run Flutter Doctor
```bash
flutter doctor
```
This checks your environment and reports missing dependencies.

### 3. Install an IDE
- **VS Code** + Flutter extension (lightweight)
- **Android Studio** + Flutter plugin (full-featured)

### 4. Create Your First Project
```bash
flutter create localwala_app
cd localwala_app
flutter run
```

## Verify Everything Works
You should see the default Flutter counter app running on your emulator or device. If `flutter doctor` shows all green checks, you are ready!$$,
    null, 20, 2
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'Understanding the Flutter Project Structure',
    $$# Understanding the Flutter Project Structure

Knowing where every file lives prevents confusion as your app grows.

## Default Project Layout
```
localwala_app/
├── android/          # Android-specific code & config
├── ios/              # iOS-specific code & config
├── lib/              # YOUR DART CODE LIVES HERE
│   └── main.dart     # App entry point
├── test/             # Unit & widget tests
├── pubspec.yaml      # Dependencies & assets
└── README.md
```

## Key Files Explained

### `lib/main.dart`
```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LocalWala',
      home: Scaffold(
        appBar: AppBar(title: const Text('LocalWala')),
        body: const Center(child: Text('Hello, LocalWala!')),
      ),
    );
  }
}
```

### `pubspec.yaml`
This is your project manifest — it declares dependencies, assets, fonts, and app metadata.

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  provider: ^6.1.0
```

## Best Practice: Organize Early
As soon as your project grows beyond 3 files, organize into folders:
```
lib/
├── models/
├── screens/
├── widgets/
├── services/
└── main.dart
```$$,
    null, 15, 3
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000001',
    'Your First Flutter App: Hello LocalWala',
    $$# Your First Flutter App: Hello LocalWala

Let us build a simple but polished "Hello LocalWala" app to practice core concepts.

## The Widget Tree
Every Flutter app is a tree of widgets. The root is `MaterialApp`, and everything inside is nested.

## Building the App
```dart
import 'package:flutter/material.dart';

void main() => runApp(const LocalWalaApp());

class LocalWalaApp extends StatelessWidget {
  const LocalWalaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.deepOrange,
        useMaterial3: true,
      ),
      home: const WelcomeScreen(),
    );
  }
}

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('LocalWala')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.store, size: 80, color: Colors.deepOrange),
            const SizedBox(height: 16),
            Text(
              'Welcome to LocalWala!',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            const Text('Your hyperlocal marketplace'),
          ],
        ),
      ),
    );
  }
}
```

## Key Takeaways
- `MaterialApp` provides theming, navigation, and localization.
- `Scaffold` gives you AppBar, Body, FAB, Drawer, and BottomNavigationBar.
- `Column` stacks children vertically; `Row` does it horizontally.
- `const` constructors improve performance by allowing compile-time constants.

## Exercise
Add a `FloatingActionButton` that shows a `SnackBar` saying "Order placed!" when tapped.$$,
    null, 20, 4
  ),

-- =====================================================
-- Module 2: Dart Language Mastery
-- =====================================================
  (
    'c1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000002',
    'Variables, Types & Null Safety',
    $$# Variables, Types & Null Safety

Dart is the language behind Flutter. Mastering it is non-negotiable.

## Variable Declaration
```dart
// Explicit types
String shopName = 'LocalWala Fresh Mart';
int itemCount = 42;
double price = 299.99;
bool isOpen = true;

// Type inference
var category = 'Groceries';    // inferred as String
final createdAt = DateTime.now(); // runtime constant
const taxRate = 0.18;           // compile-time constant
```

## var vs final vs const
| Keyword | Reassignable? | When resolved? |
|---------|--------------|----------------|
| `var` | ✅ Yes | Runtime |
| `final` | ❌ No | Runtime |
| `const` | ❌ No | Compile-time |

## Null Safety
Dart 3 enforces **sound null safety** — variables cannot be null unless explicitly declared nullable.

```dart
String name = 'LocalWala';     // Cannot be null
String? nickname;               // Can be null

// Null-aware operators
String displayName = nickname ?? 'Guest';
int? length = nickname?.length;
String forced = nickname!;      // Throws if null — use with caution!
```

## The `late` Keyword
```dart
late String apiKey;  // Promise to initialize before use

void init() {
  apiKey = 'sk_live_abc123';
}
```

Use `late` when initialization happens after declaration but before first access.$$,
    null, 15, 1
  ),
  (
    'c1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000002',
    'Functions, Closures & Higher-Order Functions',
    $$# Functions, Closures & Higher-Order Functions

Functions are first-class citizens in Dart — you can pass them around like any other value.

## Basic Functions
```dart
// Named function
double calculateTotal(double price, int quantity) {
  return price * quantity;
}

// Arrow syntax (single expression)
double applyDiscount(double total, double discount) => total * (1 - discount);
```

## Optional & Named Parameters
```dart
// Named parameters (preferred in Flutter)
void placeOrder({required String productId, int quantity = 1}) {
  print('Ordering $quantity of $productId');
}

placeOrder(productId: 'pizza-001', quantity: 3);

// Optional positional
String greet(String name, [String? title]) {
  return title != null ? '$title $name' : 'Hello, $name';
}
```

## Closures
A closure captures variables from its enclosing scope.

```dart
Function makeMultiplier(int factor) {
  return (int value) => value * factor;
}

final triple = makeMultiplier(3);
print(triple(10)); // 30
```

## Higher-Order Functions
```dart
List<String> productNames = ['Pizza', 'Burger', 'Pasta'];

// map, where, fold
var upperNames = productNames.map((n) => n.toUpperCase()).toList();
var longNames = productNames.where((n) => n.length > 4).toList();
var joined = productNames.fold('', (prev, n) => '$prev $n').trim();
```

Closures are the backbone of Flutter callbacks: `onPressed`, `onChanged`, `builder`, etc.$$,
    null, 15, 2
  ),
  (
    'c1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000002',
    'Object-Oriented Programming in Dart',
    $$# Object-Oriented Programming in Dart

Dart is a fully object-oriented language. Everything is an object — even numbers and functions.

## Classes & Constructors
```dart
class Product {
  final String id;
  final String name;
  final double price;
  final String? imageUrl;

  // Named constructor parameters (Flutter convention)
  const Product({
    required this.id,
    required this.name,
    required this.price,
    this.imageUrl,
  });

  // Factory constructor for JSON deserialization
  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      price: (json['price'] as num).toDouble(),
      imageUrl: json['image_url'] as String?,
    );
  }

  // Method
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'price': price,
    'image_url': imageUrl,
  };
}
```

## Inheritance & Mixins
```dart
abstract class BaseEntity {
  String get id;
  DateTime get createdAt;
}

mixin Searchable {
  String get searchableText;
  bool matchesQuery(String query) =>
      searchableText.toLowerCase().contains(query.toLowerCase());
}

class Vendor extends BaseEntity with Searchable {
  @override final String id;
  @override final DateTime createdAt;
  final String shopName;

  Vendor({required this.id, required this.createdAt, required this.shopName});

  @override
  String get searchableText => shopName;
}
```

## Enums
```dart
enum OrderStatus { pending, confirmed, preparing, outForDelivery, delivered, cancelled }

extension OrderStatusX on OrderStatus {
  String get label => name.replaceAllMapped(
    RegExp(r'[A-Z]'), (m) => ' ${m.group(0)}',
  ).trim();
}
```

OOP in Dart keeps your LocalWala codebase modular, testable, and scalable.$$,
    null, 20, 3
  ),
  (
    'c1000000-0000-0000-0000-000000000008',
    'b1000000-0000-0000-0000-000000000002',
    'Asynchronous Dart: Futures, Async/Await & Streams',
    $$# Asynchronous Dart: Futures, Async/Await & Streams

Mobile apps are inherently asynchronous — network calls, database reads, and file I/O all run off the main thread.

## Futures
A Future represents a value that will be available sometime in the future.

```dart
Future<String> fetchShopName() async {
  // Simulate network delay
  await Future.delayed(const Duration(seconds: 1));
  return 'LocalWala Fresh Mart';
}
```

## Async / Await
```dart
Future<void> loadProducts() async {
  try {
    final response = await http.get(
      Uri.parse('https://api.localwala.com/products'),
    );
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      final products = data.map((j) => Product.fromJson(j)).toList();
      print('Loaded ${products.length} products');
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

## Error Handling
```dart
Future<Product> getProduct(String id) async {
  try {
    final product = await repository.fetchById(id);
    return product;
  } on SocketException {
    throw NoInternetException();
  } on FormatException {
    throw InvalidDataException();
  } catch (e) {
    throw UnknownException(e.toString());
  } finally {
    // Always runs — cleanup here
  }
}
```

## Streams
Streams deliver a **sequence** of values over time — perfect for real-time features.

```dart
Stream<OrderStatus> trackOrder(String orderId) async* {
  while (true) {
    final status = await fetchOrderStatus(orderId);
    yield status;
    if (status == OrderStatus.delivered) break;
    await Future.delayed(const Duration(seconds: 5));
  }
}

// Listen to stream
trackOrder('order-123').listen((status) {
  print('Order status: $status');
});
```

## Key Takeaway
- Use `Future` for single async operations.
- Use `Stream` for continuous data (real-time tracking, chat, notifications).
- Always handle errors with `try-catch`.$$,
    null, 20, 4
  ),

-- =====================================================
-- Module 3: Flutter UI & Widget Deep Dive
-- =====================================================
  (
    'c1000000-0000-0000-0000-000000000009',
    'b1000000-0000-0000-0000-000000000003',
    'Stateless vs Stateful Widgets',
    '# Stateless vs Stateful Widgets

Every UI element in Flutter is a widget. Understanding the two fundamental types is critical.

## StatelessWidget
A widget whose output depends **only** on its constructor parameters. It never changes after being built.

```dart
class ProductCard extends StatelessWidget {
  final String name;
  final double price;

  const ProductCard({super.key, required this.name, required this.price});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(name),
        trailing: Text(''₹${price.toStringAsFixed(2)}''),
      ),
    );
  }
}
```

## StatefulWidget
A widget that can change its appearance in response to user interaction or data changes.

```dart
class QuantitySelector extends StatefulWidget {
  const QuantitySelector({super.key});

  @override
  State<QuantitySelector> createState() => _QuantitySelectorState();
}

class _QuantitySelectorState extends State<QuantitySelector> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: () => setState(() => _quantity = (_quantity - 1).clamp(1, 99)),
          icon: const Icon(Icons.remove),
        ),
        Text(''$_quantity''),
        IconButton(
          onPressed: () => setState(() => _quantity++),
          icon: const Icon(Icons.add),
        ),
      ],
    );
  }
}
```

## Rule of Thumb
- Start with `StatelessWidget`.
- Upgrade to `StatefulWidget` **only** when the widget owns mutable local state.
- For app-wide state, use a state management solution (Provider, Riverpod, Bloc).',
    null, 15, 1
  ),
  (
    'c1000000-0000-0000-0000-000000000010',
    'b1000000-0000-0000-0000-000000000003',
    'Layouts: Row, Column, Stack & Responsive Design',
    $$# Layouts: Row, Column, Stack & Responsive Design

Flutter layout is declarative: describe the tree, and Flutter paints the pixels.

## Row — Horizontal Layout
```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  children: [
    Text('LocalWala'),
    Icon(Icons.shopping_cart),
  ],
)
```

## Column — Vertical Layout
```dart
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    Text('Fresh Vegetables', style: Theme.of(context).textTheme.titleLarge),
    const SizedBox(height: 8),
    Text('Delivered in 30 minutes'),
  ],
)
```

## Expanded & Flexible
```dart
Row(
  children: [
    Expanded(flex: 3, child: TextField(decoration: InputDecoration(hintText: 'Search...'))),
    const SizedBox(width: 8),
    Expanded(flex: 1, child: ElevatedButton(onPressed: () {}, child: Text('Go'))),
  ],
)
```

## Stack — Overlays
Perfect for badges, overlapping elements, and custom layouts.
```dart
Stack(
  children: [
    Image.network(product.imageUrl),
    Positioned(
      top: 8, right: 8,
      child: Chip(label: Text('20% OFF')),
    ),
  ],
)
```

## Responsive Design with LayoutBuilder
```dart
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.maxWidth > 600) {
      return GridView.count(crossAxisCount: 3, children: productCards);
    }
    return ListView(children: productCards);
  },
)
```

## MediaQuery
```dart
final screenWidth = MediaQuery.of(context).size.width;
final isTablet = screenWidth > 768;
```

Use `LayoutBuilder` for widget-level responsiveness and `MediaQuery` for screen-level decisions.$$,
    null, 15, 2
  ),
  (
    'c1000000-0000-0000-0000-000000000011',
    'b1000000-0000-0000-0000-000000000003',
    'Material Design Components & Theming',
    $$# Material Design Components & Theming

Flutter ships with a comprehensive Material Design widget library. Mastering theming ensures consistency across your app.

## ThemeData & Material 3
```dart
MaterialApp(
  theme: ThemeData(
    colorSchemeSeed: const Color(0xFFFF6B35),  // LocalWala orange
    useMaterial3: true,
    textTheme: GoogleFonts.interTextTheme(),
  ),
  darkTheme: ThemeData(
    colorSchemeSeed: const Color(0xFFFF6B35),
    brightness: Brightness.dark,
    useMaterial3: true,
  ),
  themeMode: ThemeMode.system,  // Respect OS setting
)
```

## Common Material Widgets
```dart
// Elevated Button
ElevatedButton.icon(
  onPressed: () => addToCart(product),
  icon: const Icon(Icons.add_shopping_cart),
  label: const Text('Add to Cart'),
)

// Text Field with validation
TextFormField(
  decoration: const InputDecoration(
    labelText: 'Delivery Address',
    prefixIcon: Icon(Icons.location_on),
    border: OutlineInputBorder(),
  ),
  validator: (v) => v == null || v.isEmpty ? 'Address is required' : null,
)

// Bottom Navigation Bar
BottomNavigationBar(
  currentIndex: _selectedIndex,
  onTap: (i) => setState(() => _selectedIndex = i),
  items: const [
    BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
    BottomNavigationBarItem(icon: Icon(Icons.shopping_cart), label: 'Cart'),
    BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
  ],
)
```

## Custom Reusable Widget
```dart
class LocalWalaButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const LocalWalaButton({super.key, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: onPressed,
        child: Text(label, style: const TextStyle(fontSize: 16)),
      ),
    );
  }
}
```

Consistent theming makes your app feel polished and professional.$$,
    null, 20, 3
  ),
  (
    'c1000000-0000-0000-0000-000000000012',
    'b1000000-0000-0000-0000-000000000003',
    'Lists, Grids & Scrollable Layouts',
    $$# Lists, Grids & Scrollable Layouts

Most mobile apps display collections of data. Flutter provides powerful scrollable widgets.

## ListView.builder — Lazy Loading
```dart
ListView.builder(
  itemCount: products.length,
  itemBuilder: (context, index) {
    final product = products[index];
    return ListTile(
      leading: Image.network(product.imageUrl, width: 56, height: 56, fit: BoxFit.cover),
      title: Text(product.name),
      subtitle: Text('₹${product.price}'),
      trailing: IconButton(
        icon: const Icon(Icons.add_shopping_cart),
        onPressed: () => addToCart(product),
      ),
    );
  },
)
```
`ListView.builder` only builds visible items — essential for performance with large lists.

## GridView.builder
```dart
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    childAspectRatio: 0.75,
    crossAxisSpacing: 12,
    mainAxisSpacing: 12,
  ),
  itemCount: products.length,
  itemBuilder: (context, index) => ProductCard(product: products[index]),
)
```

## CustomScrollView & Slivers
For complex scrolling layouts with collapsing headers:
```dart
CustomScrollView(
  slivers: [
    SliverAppBar(
      expandedHeight: 200,
      floating: true,
      flexibleSpace: FlexibleSpaceBar(title: Text('LocalWala')),
    ),
    SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => ProductTile(product: products[index]),
        childCount: products.length,
      ),
    ),
  ],
)
```

## Horizontal Scrollable Categories
```dart
SizedBox(
  height: 40,
  child: ListView.separated(
    scrollDirection: Axis.horizontal,
    itemCount: categories.length,
    separatorBuilder: (_, __) => const SizedBox(width: 8),
    itemBuilder: (context, index) => Chip(label: Text(categories[index])),
  ),
)
```

## LocalWala Pattern
- **Categories**: Horizontal scroll chips at the top
- **Restaurants/Vendors**: Vertical list with images
- **Products**: 2-column grid inside each vendor page$$,
    null, 15, 4
  ),

-- =====================================================
-- Module 4: State Management & Backend Integration
-- =====================================================
  (
    'c1000000-0000-0000-0000-000000000013',
    'b1000000-0000-0000-0000-000000000004',
    'State Management with Provider & Riverpod',
    $$# State Management with Provider & Riverpod

State management is the most critical architectural decision in any Flutter app.

## What is State?
State is any data that can change over time and affects what the UI displays: cart items, user login status, selected filters, etc.

## Provider (Beginner-Friendly)
```dart
// 1. Define the model
class CartModel extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);
  int get totalItems => _items.fold(0, (sum, item) => sum + item.quantity);
  double get totalPrice => _items.fold(0.0, (sum, item) => sum + item.subtotal);

  void addItem(Product product) {
    final existing = _items.where((i) => i.product.id == product.id);
    if (existing.isNotEmpty) {
      existing.first.quantity++;
    } else {
      _items.add(CartItem(product: product));
    }
    notifyListeners();
  }

  void removeItem(String productId) {
    _items.removeWhere((i) => i.product.id == productId);
    notifyListeners();
  }
}

// 2. Provide it
ChangeNotifierProvider(create: (_) => CartModel())

// 3. Consume it
final cart = context.watch<CartModel>();
Text('${cart.totalItems} items — ₹${cart.totalPrice}');
```

## Riverpod (Production-Grade)
```dart
// Declare providers globally
final productsProvider = FutureProvider<List<Product>>((ref) async {
  return ref.read(productRepositoryProvider).fetchAll();
});

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});

// Consume in widget
class ProductList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncProducts = ref.watch(productsProvider);
    return asyncProducts.when(
      data: (products) => ListView.builder(...),
      loading: () => const CircularProgressIndicator(),
      error: (e, st) => Text('Error: $e'),
    );
  }
}
```

## When to Use What
- **setState**: Tiny local UI state (toggle, animation).
- **Provider**: Small-to-medium apps, quick prototypes.
- **Riverpod**: Production apps — better testing, no BuildContext dependency.$$,
    null, 25, 1
  ),
  (
    'c1000000-0000-0000-0000-000000000014',
    'b1000000-0000-0000-0000-000000000004',
    'Integrating with Supabase Backend',
    $$# Integrating with Supabase Backend

Supabase is an open-source Firebase alternative built on PostgreSQL. LocalWala uses Supabase for auth, database, storage, and real-time subscriptions.

## Setup
```dart
// pubspec.yaml
dependencies:
  supabase_flutter: ^2.0.0

// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
  );
  runApp(const LocalWalaApp());
}

final supabase = Supabase.instance.client;
```

## CRUD Operations
```dart
// READ — Fetch products
final data = await supabase
    .from('products')
    .select('*, vendor:vendors(name)')
    .eq('is_available', true)
    .order('created_at', ascending: false);

// CREATE — Place order
await supabase.from('orders').insert({
  'user_id': supabase.auth.currentUser!.id,
  'vendor_id': vendorId,
  'total': cart.totalPrice,
  'status': 'pending',
});

// UPDATE — Change order status
await supabase
    .from('orders')
    .update({'status': 'confirmed'})
    .eq('id', orderId);

// DELETE — Remove from cart
await supabase.from('cart_items').delete().eq('id', itemId);
```

## Real-Time Subscriptions
```dart
supabase
    .from('orders')
    .stream(primaryKey: ['id'])
    .eq('user_id', userId)
    .listen((List<Map<String, dynamic>> data) {
      setState(() => _orders = data.map(Order.fromJson).toList());
    });
```

## Authentication
```dart
// Sign up
await supabase.auth.signUp(email: email, password: password);

// Sign in
await supabase.auth.signInWithPassword(email: email, password: password);

// Get current user
final user = supabase.auth.currentUser;

// Sign out
await supabase.auth.signOut();
```

Supabase gives you the entire backend without writing a single API endpoint.$$,
    null, 25, 2
  ),
  (
    'c1000000-0000-0000-0000-000000000015',
    'b1000000-0000-0000-0000-000000000004',
    'Navigation, Routing & Deep Linking',
    $$# Navigation, Routing & Deep Linking

Users expect seamless movement between screens, and notifications should open the right page even if the app was closed.

## Navigator 1.0 (Imperative)
```dart
// Push a new screen
Navigator.push(context, MaterialPageRoute(builder: (_) => ProductScreen(id: productId)));

// Pop back
Navigator.pop(context);

// Replace (e.g., after login)
Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => HomeScreen()));

// Clear stack and go to home
Navigator.pushAndRemoveUntil(
  context,
  MaterialPageRoute(builder: (_) => HomeScreen()),
  (route) => false,
);
```

## GoRouter (Declarative — Recommended)
```dart
final router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final isLoggedIn = supabase.auth.currentUser != null;
    if (!isLoggedIn && state.matchedLocation != '/login') return '/login';
    return null;
  },
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(
      path: '/product/:id',
      builder: (_, state) => ProductScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/order/:id',
      builder: (_, state) => OrderTrackingScreen(orderId: state.pathParameters['id']!),
    ),
  ],
);

// Use it
MaterialApp.router(routerConfig: router)

// Navigate
context.go('/product/pizza-001');
context.push('/order/order-123');
```

## Deep Linking
When a push notification says "Your order is ready!", tapping it should open `/order/order-123` — even if the app was closed. GoRouter handles this natively.

## Named Routes vs GoRouter
| Feature | Named Routes | GoRouter |
|---------|-------------|----------|
| Deep linking | Manual | Built-in |
| Type-safe params | ❌ | ✅ |
| Redirects/guards | Manual | Built-in |
| Recommended by Google | ❌ | ✅ |$$,
    null, 20, 3
  ),
  (
    'c1000000-0000-0000-0000-000000000016',
    'b1000000-0000-0000-0000-000000000004',
    'Local Storage, Caching & Offline Support',
    $$# Local Storage, Caching & Offline Support

Users expect apps to work even with poor connectivity. Offline support separates great apps from average ones.

## SharedPreferences (Simple Key-Value)
```dart
// Save
final prefs = await SharedPreferences.getInstance();
await prefs.setString('last_address', '123 Main Street');
await prefs.setBool('dark_mode', true);

// Read
final address = prefs.getString('last_address') ?? 'Not set';
```
Use for: user preferences, feature flags, simple settings.

## Hive (Fast NoSQL Database)
```dart
// Setup
await Hive.initFlutter();
Hive.registerAdapter(ProductAdapter());
final box = await Hive.openBox<Product>('products');

// Write
box.put('pizza-001', product);

// Read
final cachedProduct = box.get('pizza-001');

// Read all
final allProducts = box.values.toList();
```
Use for: cart persistence, cached product catalogs, offline-first data.

## Offline-First Strategy for LocalWala
```
1. App opens → Load data from Hive (instant)
2. Fetch fresh data from Supabase in background
3. Update Hive with new data
4. UI rebuilds with fresh data
5. If offline → Hive data is still shown
```

```dart
Future<List<Product>> getProducts() async {
  // 1. Return cached data immediately
  final cached = productBox.values.toList();
  if (cached.isNotEmpty) {
    _refreshFromServer();  // fire-and-forget
    return cached;
  }
  // 2. If no cache, wait for server
  return await _fetchAndCacheProducts();
}
```

## Secure Storage (for tokens)
```dart
final storage = const FlutterSecureStorage();
await storage.write(key: 'jwt', value: token);
final jwt = await storage.read(key: 'jwt');
```
**Never** store auth tokens in SharedPreferences — use `flutter_secure_storage`.$$,
    null, 20, 4
  ),

-- =====================================================
-- Module 5: Testing, Deployment & Production Readiness
-- =====================================================
  (
    'c1000000-0000-0000-0000-000000000017',
    'b1000000-0000-0000-0000-000000000005',
    'Unit Testing & Widget Testing',
    $$# Unit Testing & Widget Testing

Testing catches bugs before your users do. Flutter has first-class testing support built in.

## Unit Tests
Test pure Dart logic — models, utilities, business rules.

```dart
// test/models/cart_model_test.dart
import 'package:test/test.dart';

void main() {
  group('CartModel', () {
    late CartModel cart;

    setUp(() => cart = CartModel());

    test('starts empty', () {
      expect(cart.totalItems, equals(0));
      expect(cart.totalPrice, equals(0.0));
    });

    test('addItem increases count', () {
      cart.addItem(Product(id: '1', name: 'Pizza', price: 250));
      expect(cart.totalItems, equals(1));
      expect(cart.totalPrice, equals(250.0));
    });

    test('removeItem decreases count', () {
      cart.addItem(Product(id: '1', name: 'Pizza', price: 250));
      cart.removeItem('1');
      expect(cart.totalItems, equals(0));
    });
  });
}
```

## Widget Tests
Test UI rendering and interaction without a device.

```dart
// test/widgets/product_card_test.dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('ProductCard displays name and price', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ProductCard(name: 'Pizza Margherita', price: 299.0),
      ),
    );

    expect(find.text('Pizza Margherita'), findsOneWidget);
    expect(find.text('₹299.00'), findsOneWidget);
  });

  testWidgets('Add to cart button triggers callback', (tester) async {
    bool tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        home: AddToCartButton(onPressed: () => tapped = true),
      ),
    );

    await tester.tap(find.byIcon(Icons.add_shopping_cart));
    expect(tapped, isTrue);
  });
}
```

## Running Tests
```bash
flutter test                    # Run all tests
flutter test test/models/       # Run specific directory
flutter test --coverage         # Generate coverage report
```

## Test Pyramid
- **Unit tests** (many): Fast, test logic in isolation.
- **Widget tests** (moderate): Test UI components.
- **Integration tests** (few): Test full user flows.$$,
    null, 20, 1
  ),
  (
    'c1000000-0000-0000-0000-000000000018',
    'b1000000-0000-0000-0000-000000000005',
    'Integration Testing & End-to-End Flows',
    $$# Integration Testing & End-to-End Flows

Integration tests verify complete user journeys on a real device or emulator.

## Setup
```yaml
# pubspec.yaml
dev_dependencies:
  integration_test:
    sdk: flutter
  flutter_test:
    sdk: flutter
```

## Writing Integration Tests
```dart
// integration_test/checkout_flow_test.dart
import 'package:integration_test/integration_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:localwala_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Complete checkout flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Browse products
    await tester.tap(find.text('Pizza Margherita'));
    await tester.pumpAndSettle();

    // Add to cart
    await tester.tap(find.byIcon(Icons.add_shopping_cart));
    await tester.pumpAndSettle();

    // Go to cart
    await tester.tap(find.byIcon(Icons.shopping_cart));
    await tester.pumpAndSettle();

    // Place order
    await tester.tap(find.text('Place Order'));
    await tester.pumpAndSettle();

    // Verify confirmation
    expect(find.text('Order Confirmed!'), findsOneWidget);
  });
}
```

## Running Integration Tests
```bash
flutter test integration_test/checkout_flow_test.dart
```

## What to Test
### Happy Paths
- Browse → Add to Cart → Checkout → Confirmation
- Login → View Orders → Track Order

### Sad Paths
- Empty cart → Checkout → Error message
- Wrong password → Login → Error shown
- No internet → Graceful fallback

## Golden Tests (Screenshot Comparison)
```dart
testWidgets('ProductCard matches golden', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: ProductCard(...)));
  await expectLater(find.byType(ProductCard), matchesGoldenFile('goldens/product_card.png'));
});
```

Golden tests catch unintended visual changes during refactors.$$,
    null, 20, 2
  ),
  (
    'c1000000-0000-0000-0000-000000000019',
    'b1000000-0000-0000-0000-000000000005',
    'Building, Signing & Publishing Your App',
    $$# Building, Signing & Publishing Your App

Shipping your app to the Play Store and App Store is the final step.

## Android: Build & Sign

### 1. Create a Keystore
```bash
keytool -genkey -v -keystore ~/localwala-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias localwala
```

### 2. Configure Signing in `android/app/build.gradle`
```groovy
signingConfigs {
    release {
        keyAlias 'localwala'
        keyPassword 'your-password'
        storeFile file('/path/to/localwala-key.jks')
        storePassword 'your-password'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 3. Build Release APK / App Bundle
```bash
flutter build apk --release           # APK
flutter build appbundle --release      # AAB (required for Play Store)
```

## iOS: Build & Sign

### 1. Open Xcode
```bash
open ios/Runner.xcworkspace
```

### 2. Configure in Xcode
- Set Bundle Identifier: `com.localwala.app`
- Select your Team (Apple Developer account)
- Set Provisioning Profile to automatic

### 3. Build
```bash
flutter build ios --release
```

## Pre-Launch Checklist
- [ ] App icon (1024x1024 for both platforms)
- [ ] Splash screen configured
- [ ] App name set in AndroidManifest.xml and Info.plist
- [ ] Permissions declared (camera, location, notifications)
- [ ] ProGuard rules for release builds
- [ ] Version number and build number incremented
- [ ] Screenshots for store listing (multiple device sizes)

## Play Store Submission
1. Create app in Google Play Console
2. Upload AAB file
3. Fill out store listing, content rating, pricing
4. Submit for review

## App Store Submission
1. Create app in App Store Connect
2. Upload via Xcode or Transporter
3. Fill out metadata, screenshots, privacy details
4. Submit for review$$,
    null, 25, 3
  ),
  (
    'c1000000-0000-0000-0000-000000000020',
    'b1000000-0000-0000-0000-000000000005',
    'CI/CD Pipelines & Production Best Practices',
    $$# CI/CD Pipelines & Production Best Practices

Automate everything that can be automated. Manual deployments are error-prone and slow.

## GitHub Actions CI/CD Pipeline
```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
          channel: 'stable'

      - name: Install dependencies
        run: flutter pub get

      - name: Analyze code
        run: flutter analyze

      - name: Run tests
        run: flutter test --coverage

      - name: Build APK
        run: flutter build apk --release
```

## Codemagic (Alternative)
Codemagic is a CI/CD platform built specifically for Flutter:
- Automatic iOS and Android builds
- Code signing management
- Direct publishing to stores

## Crashlytics & Monitoring
```dart
// Setup Firebase Crashlytics
FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;

// Catch async errors
PlatformDispatcher.instance.onError = (error, stack) {
  FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
  return true;
};
```

## Performance Best Practices
1. **Use const constructors** everywhere possible.
2. **Lazy-load images** with `CachedNetworkImage`.
3. **Avoid rebuilding the entire tree** — use `const` and `Consumer` widgets.
4. **Profile with DevTools**: `flutter run --profile` then open DevTools.
5. **Minimize app size**: Use `--split-per-abi` for Android.

## Production Monitoring Checklist
- [ ] Crashlytics or Sentry integrated
- [ ] Analytics tracking key user events
- [ ] Performance monitoring enabled
- [ ] Error boundaries in place
- [ ] Logging for debugging (but not in release)

> "Move fast and break things — but have CI/CD to catch what breaks." — Modern DevOps Wisdom$$,
    null, 20, 4
  )
on conflict (id) do nothing;

--------------------------------------------------------------
-- 4. MODULE QUIZZES (5 quizzes, 6 questions each = 30 total)
--------------------------------------------------------------
insert into academy_quizzes (
  id, module_id, title, passing_score, time_limit_minutes
) values
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Module 1 Quiz: Getting Started with Flutter & Dart', 70, 10),
  ('d1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Module 2 Quiz: Dart Language Mastery', 70, 10),
  ('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'Module 3 Quiz: Flutter UI & Widget Deep Dive', 70, 10),
  ('d1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'Module 4 Quiz: State Management & Backend Integration', 70, 10),
  ('d1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'Module 5 Quiz: Testing, Deployment & Production Readiness', 70, 10)
on conflict do nothing;

--------------------------------------------------------------
-- 5. MODULE QUIZ QUESTIONS (6 per quiz = 30 total)
--------------------------------------------------------------
insert into academy_questions (
  id, quiz_id, question, option_a, option_b, option_c, option_d,
  correct_option, explanation, difficulty, category, tags
) values

-- =====================================================
-- Quiz 1: Module 1 — Getting Started with Flutter & Dart
-- =====================================================
  (
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'Flutter compiles to:',
    'JavaScript in a WebView',
    'Native ARM code',
    'Java bytecode',
    'Python scripts',
    'b',
    'Flutter compiles Dart directly to native ARM machine code for high performance.',
    'easy', 'Flutter Basics', '{flutter,compilation}'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'Which command checks your Flutter environment for issues?',
    'flutter check',
    'flutter doctor',
    'flutter diagnose',
    'flutter verify',
    'b',
    'flutter doctor scans your system and reports any missing dependencies.',
    'easy', 'Setup', '{flutter,cli}'
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'Where does your Dart source code live in a Flutter project?',
    'src/',
    'lib/',
    'app/',
    'dart/',
    'b',
    'The lib/ directory is the default location for all Dart source files.',
    'easy', 'Project Structure', '{flutter,project}'
  ),
  (
    'e1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000001',
    'What file declares dependencies and assets in a Flutter project?',
    'package.json',
    'build.gradle',
    'pubspec.yaml',
    'Podfile',
    'c',
    'pubspec.yaml is the Dart/Flutter package manifest for dependencies, assets, and metadata.',
    'easy', 'Project Structure', '{flutter,pubspec}'
  ),
  (
    'e1000000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000001',
    'Hot Reload in Flutter preserves:',
    'Nothing — restarts the app fully',
    'App state while injecting updated code',
    'Only the splash screen',
    'Database connections only',
    'b',
    'Hot Reload injects updated source code into the running Dart VM while preserving state.',
    'medium', 'Development', '{flutter,hot-reload}'
  ),
  (
    'e1000000-0000-0000-0000-000000000006',
    'd1000000-0000-0000-0000-000000000001',
    'MaterialApp provides:',
    'Only a splash screen',
    'Theming, navigation, and localization infrastructure',
    'Database access',
    'Push notification handling',
    'b',
    'MaterialApp is the root widget that provides theme, routing, and locale support.',
    'medium', 'Flutter Widgets', '{flutter,materialapp}'
  ),

-- =====================================================
-- Quiz 2: Module 2 — Dart Language Mastery
-- =====================================================
  (
    'e1000000-0000-0000-0000-000000000007',
    'd1000000-0000-0000-0000-000000000002',
    'What is the difference between final and const in Dart?',
    'final is compile-time, const is runtime',
    'const is compile-time, final is runtime',
    'They are identical',
    'const allows reassignment',
    'b',
    'const values must be known at compile-time; final values are set once at runtime.',
    'easy', 'Dart Basics', '{dart,variables}'
  ),
  (
    'e1000000-0000-0000-0000-000000000008',
    'd1000000-0000-0000-0000-000000000002',
    'The ?? operator in Dart is called:',
    'Ternary operator',
    'Null-coalescing operator',
    'Spread operator',
    'Assignment operator',
    'b',
    'The ?? operator returns the left operand if it is non-null, otherwise the right operand.',
    'easy', 'Null Safety', '{dart,null-safety}'
  ),
  (
    'e1000000-0000-0000-0000-000000000009',
    'd1000000-0000-0000-0000-000000000002',
    'A factory constructor in Dart is used for:',
    'Creating abstract classes',
    'Returning an existing instance or a subtype',
    'Defining global variables',
    'Running tests',
    'b',
    'Factory constructors can return cached instances, subtypes, or computed objects.',
    'medium', 'OOP', '{dart,constructors}'
  ),
  (
    'e1000000-0000-0000-0000-000000000010',
    'd1000000-0000-0000-0000-000000000002',
    'Which Dart feature allows you to add methods to existing classes?',
    'Inheritance',
    'Extensions',
    'Mixins',
    'Generics',
    'b',
    'Extensions let you add new functionality to existing types without modifying them.',
    'medium', 'Dart Advanced', '{dart,extensions}'
  ),
  (
    'e1000000-0000-0000-0000-000000000011',
    'd1000000-0000-0000-0000-000000000002',
    'async* in Dart is used to create:',
    'A Future',
    'A synchronous generator',
    'An asynchronous generator (Stream)',
    'A class constructor',
    'c',
    'async* defines a function that yields values as a Stream over time.',
    'medium', 'Async Dart', '{dart,streams,async}'
  ),
  (
    'e1000000-0000-0000-0000-000000000012',
    'd1000000-0000-0000-0000-000000000002',
    'What happens when you use the ! operator on a null value?',
    'Returns a default value',
    'Throws a runtime exception',
    'Returns an empty string',
    'Silently ignores the null',
    'b',
    'The ! (bang) operator asserts non-null and throws if the value is actually null.',
    'medium', 'Null Safety', '{dart,null-safety}'
  ),

-- =====================================================
-- Quiz 3: Module 3 — Flutter UI & Widget Deep Dive
-- =====================================================
  (
    'e1000000-0000-0000-0000-000000000013',
    'd1000000-0000-0000-0000-000000000003',
    'When should you use StatefulWidget over StatelessWidget?',
    'Always — StatelessWidget is deprecated',
    'When the widget owns mutable state that changes over time',
    'Only for animations',
    'Only for network calls',
    'b',
    'StatefulWidget is needed when the widget must track and respond to mutable internal state.',
    'easy', 'Flutter Widgets', '{flutter,stateful}'
  ),
  (
    'e1000000-0000-0000-0000-000000000014',
    'd1000000-0000-0000-0000-000000000003',
    'Which widget is used to overlay elements on top of each other?',
    'Column',
    'Row',
    'Stack',
    'Wrap',
    'c',
    'Stack allows children to overlap, useful for badges, overlays, and floating elements.',
    'easy', 'Layout', '{flutter,stack}'
  ),
  (
    'e1000000-0000-0000-0000-000000000015',
    'd1000000-0000-0000-0000-000000000003',
    'useMaterial3: true in ThemeData enables:',
    'Material Design 1 widgets',
    'Material Design 3 (Material You) components',
    'iOS-style Cupertino widgets',
    'Web-only styling',
    'b',
    'Material 3 (Material You) brings dynamic color, updated components, and modern design.',
    'easy', 'Theming', '{flutter,material3}'
  ),
  (
    'e1000000-0000-0000-0000-000000000016',
    'd1000000-0000-0000-0000-000000000003',
    'ListView.builder is preferred over ListView because:',
    'It has more styling options',
    'It lazily builds only visible items, saving memory',
    'It supports horizontal scrolling only',
    'It does not require a builder function',
    'b',
    'ListView.builder creates items on-demand as they scroll into view.',
    'medium', 'Performance', '{flutter,listview}'
  ),
  (
    'e1000000-0000-0000-0000-000000000017',
    'd1000000-0000-0000-0000-000000000003',
    'SliverAppBar is typically used inside:',
    'ListView',
    'CustomScrollView',
    'Column',
    'Container',
    'b',
    'SliverAppBar works with CustomScrollView to create collapsing/expanding app bars.',
    'medium', 'Advanced UI', '{flutter,slivers}'
  ),
  (
    'e1000000-0000-0000-0000-000000000018',
    'd1000000-0000-0000-0000-000000000003',
    'LayoutBuilder gives you access to:',
    'The device OS version',
    'The parent widget constraints (available width/height)',
    'The app theme colors',
    'The navigation stack',
    'b',
    'LayoutBuilder provides BoxConstraints so you can build responsive layouts.',
    'medium', 'Responsive Design', '{flutter,responsive}'
  ),

-- =====================================================
-- Quiz 4: Module 4 — State Management & Backend Integration
-- =====================================================
  (
    'e1000000-0000-0000-0000-000000000019',
    'd1000000-0000-0000-0000-000000000004',
    'In Provider, notifyListeners() is called to:',
    'Log a message',
    'Trigger a UI rebuild for all widgets watching this model',
    'Save data to disk',
    'Send a push notification',
    'b',
    'notifyListeners() tells all Consumer/watch widgets to rebuild with updated data.',
    'easy', 'State Management', '{flutter,provider}'
  ),
  (
    'e1000000-0000-0000-0000-000000000020',
    'd1000000-0000-0000-0000-000000000004',
    'Supabase is best described as:',
    'A CSS framework',
    'An open-source Firebase alternative built on PostgreSQL',
    'A mobile testing tool',
    'A version control system',
    'b',
    'Supabase provides auth, database, storage, and real-time subscriptions on top of PostgreSQL.',
    'easy', 'Backend', '{supabase,backend}'
  ),
  (
    'e1000000-0000-0000-0000-000000000021',
    'd1000000-0000-0000-0000-000000000004',
    'GoRouter redirect is useful for:',
    'Styling navigation bars',
    'Protecting routes based on auth state',
    'Caching images',
    'Handling animations',
    'b',
    'GoRouter redirect intercepts navigation and can send unauthenticated users to login.',
    'medium', 'Navigation', '{flutter,gorouter}'
  ),
  (
    'e1000000-0000-0000-0000-000000000022',
    'd1000000-0000-0000-0000-000000000004',
    'flutter_secure_storage should be used instead of SharedPreferences for:',
    'Storing user preferences like dark mode',
    'Storing sensitive data like JWT tokens',
    'Caching images',
    'Storing build numbers',
    'b',
    'flutter_secure_storage encrypts data, making it safe for tokens and secrets.',
    'medium', 'Security', '{security,storage}'
  ),
  (
    'e1000000-0000-0000-0000-000000000023',
    'd1000000-0000-0000-0000-000000000004',
    'Supabase .stream() is used for:',
    'Downloading large files',
    'Real-time subscriptions that update UI on data changes',
    'Running batch SQL queries',
    'Compressing images',
    'b',
    '.stream() listens for INSERT, UPDATE, DELETE events and pushes changes to the client.',
    'medium', 'Real-Time', '{supabase,realtime}'
  ),
  (
    'e1000000-0000-0000-0000-000000000024',
    'd1000000-0000-0000-0000-000000000004',
    'The offline-first pattern in LocalWala means:',
    'The app only works offline',
    'Data is loaded from local cache first, then refreshed from the server',
    'The app disables WiFi',
    'Data is never cached',
    'b',
    'Offline-first shows cached data instantly and refreshes in the background.',
    'medium', 'Architecture', '{offline,caching}'
  ),

-- =====================================================
-- Quiz 5: Module 5 — Testing, Deployment & Production Readiness
-- =====================================================
  (
    'e1000000-0000-0000-0000-000000000025',
    'd1000000-0000-0000-0000-000000000005',
    'testWidgets in Flutter is used for:',
    'Unit testing pure Dart logic',
    'Testing widget rendering and user interactions',
    'Integration testing on a device',
    'Performance profiling',
    'b',
    'testWidgets pumps widgets and lets you tap, type, and assert on rendered UI.',
    'easy', 'Testing', '{flutter,widget-test}'
  ),
  (
    'e1000000-0000-0000-0000-000000000026',
    'd1000000-0000-0000-0000-000000000005',
    'flutter build appbundle produces:',
    'An APK file',
    'An AAB file required for Play Store',
    'An iOS IPA file',
    'A web bundle',
    'b',
    'Android App Bundles (AAB) are required by Google Play Store for new app submissions.',
    'easy', 'Deployment', '{flutter,build,android}'
  ),
  (
    'e1000000-0000-0000-0000-000000000027',
    'd1000000-0000-0000-0000-000000000005',
    'Golden tests in Flutter compare:',
    'Execution time between builds',
    'Current widget rendering against a saved reference screenshot',
    'Number of widgets in the tree',
    'Memory usage',
    'b',
    'Golden tests catch unintended visual regressions by comparing pixel output.',
    'medium', 'Testing', '{flutter,golden-test}'
  ),
  (
    'e1000000-0000-0000-0000-000000000028',
    'd1000000-0000-0000-0000-000000000005',
    'ProGuard in Android release builds is used for:',
    'Adding more features',
    'Shrinking, obfuscating, and optimizing code',
    'Managing push notifications',
    'Database migrations',
    'b',
    'ProGuard reduces APK size and makes reverse-engineering harder.',
    'medium', 'Android', '{proguard,android}'
  ),
  (
    'e1000000-0000-0000-0000-000000000029',
    'd1000000-0000-0000-0000-000000000005',
    'GitHub Actions in a Flutter CI/CD pipeline automates:',
    'Writing code for you',
    'Building, testing, and deploying on every push',
    'Managing your GitHub profile',
    'Designing UI mockups',
    'b',
    'CI/CD pipelines run tests and builds automatically on code changes.',
    'medium', 'DevOps', '{ci-cd,github-actions}'
  ),
  (
    'e1000000-0000-0000-0000-000000000030',
    'd1000000-0000-0000-0000-000000000005',
    'Firebase Crashlytics helps by:',
    'Building the UI faster',
    'Reporting crashes and non-fatal errors in production',
    'Managing DNS records',
    'Compiling Dart code',
    'b',
    'Crashlytics captures crash reports with stack traces for debugging production issues.',
    'medium', 'Monitoring', '{crashlytics,monitoring}'
  )
on conflict (id) do nothing;

--------------------------------------------------------------
-- 6. FINAL ASSESSMENT (30 unique questions — no overlap with module quizzes)
--------------------------------------------------------------
insert into academy_quizzes (
  id, module_id, title, passing_score, time_limit_minutes
) values
  (
    'f1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Final Assessment: Mobile Application Development with Flutter Mastery Exam',
    75,
    45
  )
on conflict do nothing;

insert into academy_questions (
  id, quiz_id, question, option_a, option_b, option_c, option_d,
  correct_option, explanation, difficulty, category, tags
) values
  (
    'e1000000-0000-0000-0000-000000000200',
    'f1000000-0000-0000-0000-000000000001',
    'What programming language does Flutter use?',
    'JavaScript',
    'Dart',
    'Kotlin',
    'Swift',
    'b',
    'Flutter is built on Dart, a language optimized for client-side development.',
    'easy', 'Flutter', '{flutter,dart}'
  ),
  (
    'e1000000-0000-0000-0000-000000000201',
    'f1000000-0000-0000-0000-000000000001',
    'Which widget is the root of most Flutter apps?',
    'Scaffold',
    'Container',
    'MaterialApp',
    'AppBar',
    'c',
    'MaterialApp provides essential app-level functionality like theming and routing.',
    'easy', 'Flutter', '{flutter,materialapp}'
  ),
  (
    'e1000000-0000-0000-0000-000000000202',
    'f1000000-0000-0000-0000-000000000001',
    'Scaffold provides which set of UI elements?',
    'Only text styling',
    'AppBar, Body, FAB, Drawer, BottomNavigationBar',
    'Only the status bar',
    'Database access layer',
    'b',
    'Scaffold is the visual layout structure for a Material Design screen.',
    'easy', 'Flutter', '{flutter,scaffold}'
  ),
  (
    'e1000000-0000-0000-0000-000000000203',
    'f1000000-0000-0000-0000-000000000001',
    'Which Dart keyword declares a variable that can only be set once at runtime?',
    'var',
    'const',
    'final',
    'dynamic',
    'c',
    'final variables are assigned once at runtime and cannot be reassigned.',
    'easy', 'Dart', '{dart,variables}'
  ),
  (
    'e1000000-0000-0000-0000-000000000204',
    'f1000000-0000-0000-0000-000000000001',
    'What does flutter pub get do?',
    'Runs the app',
    'Downloads and installs declared dependencies',
    'Creates a new project',
    'Deploys to the store',
    'b',
    'flutter pub get resolves and downloads packages listed in pubspec.yaml.',
    'easy', 'CLI', '{flutter,pub,dependencies}'
  ),
  (
    'e1000000-0000-0000-0000-000000000205',
    'f1000000-0000-0000-0000-000000000001',
    'BuildContext in Flutter represents:',
    'The device CPU architecture',
    'The widget location in the widget tree',
    'The app version number',
    'The Dart SDK version',
    'b',
    'BuildContext identifies where a widget sits in the tree and gives access to inherited data.',
    'easy', 'Flutter', '{flutter,context}'
  ),
  (
    'e1000000-0000-0000-0000-000000000206',
    'f1000000-0000-0000-0000-000000000001',
    'Which method triggers a StatefulWidget to rebuild?',
    'build()',
    'setState()',
    'initState()',
    'dispose()',
    'b',
    'setState() marks the widget as dirty and schedules a rebuild.',
    'easy', 'Flutter', '{flutter,setstate}'
  ),
  (
    'e1000000-0000-0000-0000-000000000207',
    'f1000000-0000-0000-0000-000000000001',
    'SizedBox is commonly used for:',
    'Making network requests',
    'Adding fixed spacing between widgets',
    'Managing state',
    'Handling navigation',
    'b',
    'SizedBox(height: 16) or SizedBox(width: 8) is the standard way to add spacing.',
    'easy', 'Layout', '{flutter,sizedbox}'
  ),
  (
    'e1000000-0000-0000-0000-000000000208',
    'f1000000-0000-0000-0000-000000000001',
    'Supabase RLS (Row Level Security) controls:',
    'Widget rendering order',
    'Which rows a user can read, insert, update, or delete',
    'Dart compile targets',
    'Flutter hot reload speed',
    'b',
    'RLS policies enforce data access rules at the database level.',
    'medium', 'Supabase', '{supabase,rls}'
  ),
  (
    'e1000000-0000-0000-0000-000000000209',
    'f1000000-0000-0000-0000-000000000001',
    'FutureProvider in Riverpod is used when:',
    'Data is synchronously available',
    'Data needs to be fetched asynchronously (e.g., from an API)',
    'The widget is StatelessWidget only',
    'You need animations',
    'b',
    'FutureProvider wraps an async operation and exposes loading/data/error states.',
    'medium', 'State Management', '{riverpod,future}'
  ),
  (
    'e1000000-0000-0000-0000-000000000210',
    'f1000000-0000-0000-0000-000000000001',
    'Navigator.pushAndRemoveUntil is useful for:',
    'Adding a dialog',
    'Clearing the navigation stack (e.g., after logout)',
    'Playing animations',
    'Downloading files',
    'b',
    'pushAndRemoveUntil clears the back stack so the user cannot go back to protected screens.',
    'medium', 'Navigation', '{flutter,navigation}'
  ),
  (
    'e1000000-0000-0000-0000-000000000211',
    'f1000000-0000-0000-0000-000000000001',
    'Hive is preferred over SQLite for Flutter because:',
    'It uses SQL queries',
    'It has zero native dependencies and is very fast for key-value data',
    'It requires no initialization',
    'It is built into Flutter SDK',
    'b',
    'Hive is a pure Dart NoSQL database with no platform-specific code, making it fast and easy to use.',
    'medium', 'Storage', '{hive,offline}'
  ),
  (
    'e1000000-0000-0000-0000-000000000212',
    'f1000000-0000-0000-0000-000000000001',
    'StreamBuilder in Flutter is used to:',
    'Build static UI only',
    'Rebuild UI whenever a Stream emits a new value',
    'Manage routing',
    'Handle gestures',
    'b',
    'StreamBuilder listens to a Stream and rebuilds its child on every new event.',
    'medium', 'Reactive UI', '{flutter,streams}'
  ),
  (
    'e1000000-0000-0000-0000-000000000213',
    'f1000000-0000-0000-0000-000000000001',
    'Which package is recommended for declarative routing in Flutter?',
    'url_launcher',
    'go_router',
    'http',
    'path_provider',
    'b',
    'go_router is Google''s recommended package for declarative routing with deep link support.',
    'medium', 'Navigation', '{flutter,gorouter}'
  ),
  (
    'e1000000-0000-0000-0000-000000000214',
    'f1000000-0000-0000-0000-000000000001',
    'The initState() method is called:',
    'Every time the widget rebuilds',
    'Once when the StatefulWidget is first inserted into the tree',
    'When the app is minimized',
    'When the user taps the back button',
    'b',
    'initState() runs once for initialization — subscriptions, controllers, etc.',
    'medium', 'Flutter Lifecycle', '{flutter,lifecycle}'
  ),
  (
    'e1000000-0000-0000-0000-000000000215',
    'f1000000-0000-0000-0000-000000000001',
    'dispose() in a StatefulWidget should be used to:',
    'Navigate to another screen',
    'Clean up controllers, streams, and subscriptions',
    'Fetch data from API',
    'Build the widget tree',
    'b',
    'dispose() prevents memory leaks by cleaning up resources when the widget is removed.',
    'medium', 'Flutter Lifecycle', '{flutter,dispose}'
  ),
  (
    'e1000000-0000-0000-0000-000000000216',
    'f1000000-0000-0000-0000-000000000001',
    'MediaQuery.of(context).size gives you:',
    'The widget tree depth',
    'The screen width and height',
    'The Dart SDK version',
    'The number of widgets',
    'b',
    'MediaQuery provides screen dimensions for building responsive layouts.',
    'medium', 'Responsive', '{flutter,mediaquery}'
  ),
  (
    'e1000000-0000-0000-0000-000000000217',
    'f1000000-0000-0000-0000-000000000001',
    'The purpose of a keystore file in Android is:',
    'Managing dependencies',
    'Signing the app to prove identity and integrity',
    'Configuring the splash screen',
    'Running unit tests',
    'b',
    'The keystore contains your private key used to digitally sign release builds.',
    'medium', 'Deployment', '{android,signing}'
  ),
  (
    'e1000000-0000-0000-0000-000000000218',
    'f1000000-0000-0000-0000-000000000001',
    'CachedNetworkImage is used to:',
    'Compress images on the server',
    'Download, cache, and display network images efficiently',
    'Generate placeholder images',
    'Convert images to PDF',
    'b',
    'CachedNetworkImage avoids re-downloading images by caching them locally.',
    'medium', 'Performance', '{flutter,images,caching}'
  ),
  (
    'e1000000-0000-0000-0000-000000000219',
    'f1000000-0000-0000-0000-000000000001',
    'In Clean Architecture, the domain layer contains:',
    'UI widgets and screens',
    'Business logic, entities, and use cases',
    'API endpoint URLs',
    'Build scripts',
    'b',
    'The domain layer is framework-independent and holds core business rules.',
    'hard', 'Architecture', '{clean-arch,domain}'
  ),
  (
    'e1000000-0000-0000-0000-000000000220',
    'f1000000-0000-0000-0000-000000000001',
    'When using Riverpod, ref.watch vs ref.read difference:',
    'watch is for one-time reads, read is for continuous',
    'watch rebuilds on changes, read gets value once without listening',
    'They are identical',
    'read is deprecated',
    'b',
    'ref.watch subscribes to changes and triggers rebuilds; ref.read is a one-shot read.',
    'hard', 'Riverpod', '{riverpod,watch,read}'
  ),
  (
    'e1000000-0000-0000-0000-000000000221',
    'f1000000-0000-0000-0000-000000000001',
    'flutter run --profile is used for:',
    'Running in debug mode',
    'Performance profiling with DevTools',
    'Generating code coverage',
    'Publishing to the store',
    'b',
    'Profile mode enables performance overlays and DevTools profiling without debug overhead.',
    'hard', 'Performance', '{flutter,profiling}'
  ),
  (
    'e1000000-0000-0000-0000-000000000222',
    'f1000000-0000-0000-0000-000000000001',
    'Supabase realtime subscriptions use which protocol under the hood?',
    'HTTP polling',
    'WebSockets',
    'SMTP',
    'FTP',
    'b',
    'Supabase uses WebSocket connections to push real-time database changes to clients.',
    'hard', 'Supabase', '{supabase,websockets}'
  ),
  (
    'e1000000-0000-0000-0000-000000000223',
    'f1000000-0000-0000-0000-000000000001',
    'The const keyword on widgets helps performance because:',
    'It makes them invisible',
    'It allows compile-time constants that skip rebuilds',
    'It reduces the APK size only',
    'It enables hot reload',
    'b',
    'const widgets are canonicalized at compile time and never rebuilt unnecessarily.',
    'hard', 'Performance', '{flutter,const}'
  ),
  (
    'e1000000-0000-0000-0000-000000000224',
    'f1000000-0000-0000-0000-000000000001',
    'What does --split-per-abi do when building an Android APK?',
    'Splits code by feature module',
    'Creates separate APKs for each CPU architecture, reducing size',
    'Splits the app into multiple apps',
    'Creates a web version',
    'b',
    'Splitting per ABI avoids bundling code for architectures the device does not use.',
    'hard', 'Deployment', '{android,apk,optimization}'
  ),
  (
    'e1000000-0000-0000-0000-000000000225',
    'f1000000-0000-0000-0000-000000000001',
    'In a Supabase RLS policy, auth.uid() returns:',
    'The database table name',
    'The ID of the currently authenticated user',
    'The server IP address',
    'The app bundle ID',
    'b',
    'auth.uid() references the JWT user ID for row-level access control.',
    'hard', 'Supabase', '{supabase,rls,auth}'
  ),
  (
    'e1000000-0000-0000-0000-000000000226',
    'f1000000-0000-0000-0000-000000000001',
    'Mixin in Dart differs from inheritance because:',
    'Mixins cannot have methods',
    'A class can use multiple mixins but extend only one class',
    'Mixins are slower',
    'Inheritance is not supported in Dart',
    'b',
    'Dart uses mixins (with keyword) to compose behavior from multiple sources.',
    'hard', 'Dart OOP', '{dart,mixins}'
  ),
  (
    'e1000000-0000-0000-0000-000000000227',
    'f1000000-0000-0000-0000-000000000001',
    'Shorebird allows Flutter teams to:',
    'Write backend APIs in Dart',
    'Ship over-the-air code patches without app store review',
    'Generate UI from Figma',
    'Run iOS apps on Android',
    'b',
    'Shorebird provides code push for Flutter, enabling instant patches.',
    'hard', 'Deployment', '{shorebird,ota}'
  ),
  (
    'e1000000-0000-0000-0000-000000000228',
    'f1000000-0000-0000-0000-000000000001',
    'RepaintBoundary widget helps Flutter by:',
    'Adding visual borders',
    'Isolating a subtree so it repaints independently, reducing GPU work',
    'Managing navigation boundaries',
    'Handling keyboard input',
    'b',
    'RepaintBoundary prevents unnecessary repaints of expensive widget subtrees.',
    'hard', 'Performance', '{flutter,repaint}'
  ),
  (
    'e1000000-0000-0000-0000-000000000229',
    'f1000000-0000-0000-0000-000000000001',
    'The test pyramid recommends the most tests at which level?',
    'Integration tests',
    'Unit tests',
    'E2E tests',
    'Manual tests',
    'b',
    'Unit tests should be the most numerous: fast, cheap, and test logic in isolation.',
    'hard', 'Testing', '{testing,pyramid}'
  ),
  (
    'e1000000-0000-0000-0000-000000000230',
    'f1000000-0000-0000-0000-000000000001',
    'PlatformDispatcher.instance.onError in Flutter catches:',
    'Only synchronous errors',
    'Uncaught asynchronous errors across the app',
    'Build warnings only',
    'Lint errors',
    'b',
    'PlatformDispatcher.instance.onError is the last resort for catching unhandled async errors.',
    'hard', 'Error Handling', '{flutter,errors,crashlytics}'
  )
on conflict (id) do nothing;

--------------------------------------------------------------
-- 7. GRANTS
--------------------------------------------------------------
grant select on academy_courses to anon, authenticated;
grant select on academy_modules to anon, authenticated;
grant select on academy_lessons to anon, authenticated;
grant select on academy_quizzes to anon, authenticated;
grant select on academy_questions to anon, authenticated;
