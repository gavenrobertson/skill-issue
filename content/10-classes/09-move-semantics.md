---
title: Move Semantics
summary: Rvalue references, std::move, the move constructor and move assignment, why noexcept matters, moved-from objects, and the rules of five and zero.
---

## Why copy when you can steal?

Copying an `IntArray` of a million elements means allocating a million ints and copying every one.
That's necessary when the original is still going to be used. But often it **isn't**:

```cpp
IntArray makeBig();            // returns a temporary
IntArray a = makeBig();        // the temporary is about to die anyway
v.push_back(IntArray(1000));   // same: nobody can ever use that temporary again
```

When the source is about to be destroyed, copying its contents and then freeing the original is
wasteful. It would be far cheaper to **steal** its pointer: take the buffer, and leave the source
empty. That's a **move**. For a class holding a pointer, a move copies one pointer and one size,
however big the data is.

## Recap: lvalues, rvalues, and rvalue references

- An **lvalue** is something with a name and an address that persists: a variable, `arr[i]`, `*p`.
- An **rvalue** is a temporary that's about to vanish: a literal, `a + b`, a function's returned value.
- An **rvalue reference** `T&&` binds **only to rvalues**. It means "here's an object nobody else
  will use again; you may take its guts".

Overloading on `const T&` vs `T&&` lets a function behave differently for each:

```cpp run
#include <iostream>
#include <string>

void take(const std::string& s) { std::cout << "lvalue: copy \"" << s << "\"\n"; }
void take(std::string&& s)      { std::cout << "rvalue: may steal \"" << s << "\"\n"; }

int main() {
    std::string name = "Ada";
    take(name);                 // name is an lvalue
    take(name + "!");           // the result of + is a temporary: rvalue
    take(std::string("tmp"));   // temporary: rvalue
    take(std::move(name));      // std::move turns name into an rvalue
}
```

```output
lvalue: copy "Ada"
rvalue: may steal "Ada!"
rvalue: may steal "tmp"
rvalue: may steal "Ada"
```

### `std::move` doesn't move anything

`std::move(x)` (from `<utility>`) is just a **cast** to `T&&`. It says "I'm done with `x`; treat it as
an rvalue". The actual moving happens only if the receiving function (a move constructor, a move
assignment, or an `&&` overload) takes advantage of it. `take(std::move(name))` above didn't
change `name` at all, because that `take` only printed it.

> **Note:** A **named** rvalue reference is itself an lvalue. Inside `void f(std::string&& s)`, the
> expression `s` has a name, so passing it on as `g(s)` *copies*. Write `g(std::move(s))` to keep
> moving. Rule of thumb: if it has a name, it's an lvalue.

## Move constructor and move assignment

These are the two special member functions for moving, mirroring the two copy operations:

| | Signature | Job |
| --- | --- | --- |
| **Move constructor** | `T(T&& other) noexcept` | build a new object by stealing `other`'s resources |
| **Move assignment** | `T& operator=(T&& other) noexcept` | release my resources, then steal `other`'s |

After stealing, you **must** leave `other` in a state its destructor can handle, typically "empty"
(`nullptr`, size 0). Otherwise both objects would free the same buffer.

```cpp run
#include <cstddef>
#include <iostream>
#include <utility>

class IntArray {
    int* data_ = nullptr;
    std::size_t size_ = 0;

public:
    explicit IntArray(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~IntArray() { delete[] data_; }

    IntArray(const IntArray& other) : data_(new int[other.size_]), size_(other.size_) {
        for (std::size_t i = 0; i < size_; ++i) data_[i] = other.data_[i];
        std::cout << "  copy " << size_ << " elements\n";
    }

    IntArray(IntArray&& other) noexcept
        : data_(other.data_), size_(other.size_) {   // steal the pointer...
        other.data_ = nullptr;                       // ...and leave other empty
        other.size_ = 0;
        std::cout << "  move (no allocation)\n";
    }

    IntArray& operator=(IntArray&& other) noexcept {
        if (this != &other) {
            delete[] data_;                                  // release what we had
            data_ = std::exchange(other.data_, nullptr);     // take other's, set it to nullptr
            size_ = std::exchange(other.size_, 0);
        }
        std::cout << "  move-assign\n";
        return *this;
    }

    IntArray& operator=(const IntArray&) = delete;   // kept short for this demo

    std::size_t size() const { return size_; }
};

IntArray make(std::size_t n) {
    IntArray result(n);
    return result;           // moved (or elided entirely), never copied
}

int main() {
    IntArray a(1000);
    std::cout << "copy:\n";
    IntArray b = a;                    // a is an lvalue: copy
    std::cout << "move:\n";
    IntArray c = std::move(a);         // explicitly moved
    std::cout << "sizes: " << a.size() << ' ' << c.size() << '\n';
    std::cout << "move-assign:\n";
    b = make(5);                       // a temporary on the right: move assignment
    std::cout << "b.size() = " << b.size() << '\n';
}
```

```output
copy:
  copy 1000 elements
move:
  move (no allocation)
sizes: 0 1000
move-assign:
  move-assign
b.size() = 5
```

`std::exchange(obj, newValue)` (from `<utility>`) sets `obj` to `newValue` and returns the old value:
perfect for "take this and leave nothing behind". Returning the local `result` from `make` didn't print
anything: the compiler elided the move entirely (and if it couldn't, it would move, never copy).

### When does the compiler move automatically?

- Initializing or assigning from a **temporary**: `T a = makeT();`, `a = T(...)`.
- **Returning a local variable** by value (if elision doesn't remove it entirely).
- Passing a temporary to a function that takes `T` by value or `T&&`.
- Anywhere you write `std::move(x)`.

## `noexcept` moves: why `std::vector` cares

When a vector runs out of capacity, it allocates a bigger buffer and transfers the elements. If a move
threw an exception halfway through, some elements would already be gutted and the vector couldn't be
restored, breaking its "strong exception guarantee". So **`std::vector` only moves elements during
reallocation if the move constructor is `noexcept`**. Otherwise, it falls back to copying.

```cpp run
#include <iostream>
#include <vector>

struct Safe {
    inline static int copies = 0, moves = 0;
    Safe() = default;
    Safe(const Safe&) { ++copies; }
    Safe(Safe&&) noexcept { ++moves; }       // promises not to throw
};

struct Risky {
    inline static int copies = 0, moves = 0;
    Risky() = default;
    Risky(const Risky&) { ++copies; }
    Risky(Risky&&) { ++moves; }              // might throw (as far as vector knows)
};

int main() {
    std::vector<Safe> s;
    std::vector<Risky> r;
    for (int i = 0; i < 3; ++i) {            // no reserve(): the vectors reallocate as they grow
        s.push_back(Safe{});
        r.push_back(Risky{});
    }
    std::cout << "Safe:  " << Safe::copies << " copies, " << Safe::moves << " moves\n";
    std::cout << "Risky: " << Risky::copies << " copies, " << Risky::moves << " moves\n";
}
```

```output
Safe:  0 copies, 6 moves
Risky: 3 copies, 3 moves
```

Both pushed three temporaries (three moves). During reallocations, `Safe` elements were moved but
`Risky` elements were copied. **Always mark move constructors and move assignment `noexcept`.** A
move that only swaps pointers can't fail anyway.

## The moved-from state

What's left in an object after you move from it? For standard library types the rule is: **valid but
unspecified**. The object is still a real object: you can destroy it, assign a new value to it, or call
functions with no preconditions (like `.clear()` or `.size()`), but you shouldn't rely on its value.

```cpp run
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::string s = "a fairly long string that lives on the heap";
    std::vector<std::string> v;
    v.push_back(std::move(s));       // s's buffer was stolen

    s = "reused";                    // OK: assigning gives it a known value again
    std::cout << s << '\n';
    std::cout << v[0] << '\n';
}
```

```output
reused
a fairly long string that lives on the heap
```

For **your** classes, you decide: document what a moved-from object looks like. "Empty" (like
`IntArray` above, with size 0) is the usual choice.

## The rule of five

Move operations extend the rule of three:

> If a class needs a custom **destructor**, **copy constructor**, **copy assignment**, **move
> constructor**, or **move assignment**, it should define or `= delete` (or `= default`) **all five**.

There's a subtle trap that makes this important: **declaring a destructor or a copy operation
suppresses the implicit move operations.** The class then silently **copies** where you expected a move:

```cpp run
#include <iostream>
#include <utility>

struct Loud {
    Loud() = default;
    Loud(const Loud&) { std::cout << "copy\n"; }
    Loud(Loud&&) noexcept { std::cout << "move\n"; }
};

struct Plain {
    Loud member;                     // nothing user-declared: gets implicit moves
};

struct WithDestructor {
    Loud member;
    ~WithDestructor() {}             // user-declared destructor: no implicit moves!
};

int main() {
    Plain p1;
    [[maybe_unused]] Plain p2 = std::move(p1);            // move
    WithDestructor w1;
    [[maybe_unused]] WithDestructor w2 = std::move(w1);   // silently copies
}
```

```output
move
copy
```

(`[[maybe_unused]]` is an attribute that just silences the compiler's "unused variable" warning.)

If you need a destructor (for example a `virtual` one, coming in the Inheritance module) but still want
default copying and moving, say so explicitly:

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    Shape(const Shape&) = default;
    Shape& operator=(const Shape&) = default;
    Shape(Shape&&) = default;
    Shape& operator=(Shape&&) = default;
    Shape() = default;
};
```

Here's the full set of special member functions and when the compiler generates each:

| You declare... | default ctor | destructor | copy ctor / assign | move ctor / assign |
| --- | --- | --- | --- | --- |
| nothing | generated | generated | generated | generated |
| any constructor | **not generated** | generated | generated | generated |
| destructor | generated | yours | generated (deprecated) | **not declared** (copies used) |
| copy ctor or copy assign | generated* | generated | yours / generated (deprecated) | **not declared** (copies used) |
| move ctor or move assign | generated* | generated | **deleted** | yours / not declared |

(*only if you declared no other constructor. A copy or move *constructor* is a constructor too.)

## The rule of zero

The best number of special member functions to write is **zero**.

> Classes that don't manage a resource directly shouldn't declare any of the five. Hold resources in
> members that manage themselves: `std::vector`, `std::string`, `std::unique_ptr`, `std::shared_ptr`,
> file streams. The generated operations then do the right thing automatically.

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Document {
    std::string title_;
    std::vector<std::string> lines_;          // copies deeply, moves cheaply, frees itself
public:
    explicit Document(std::string title) : title_(std::move(title)) {}
    void add(const std::string& line) { lines_.push_back(line); }
    std::size_t lineCount() const { return lines_.size(); }
    const std::string& title() const { return title_; }
    // no destructor, no copy/move operations: all generated, all correct
};

class Editor {
    std::unique_ptr<Document> doc_;           // unique ownership: makes Editor move-only
public:
    explicit Editor(std::unique_ptr<Document> d) : doc_(std::move(d)) {}
    const Document& doc() const { return *doc_; }
};

int main() {
    Document a("notes");
    a.add("first");
    Document b = a;                 // deep copy, for free
    b.add("second");
    Document c = std::move(b);      // cheap move, for free
    std::cout << a.lineCount() << ' ' << c.lineCount() << '\n';

    Editor e1(std::make_unique<Document>("draft"));
    Editor e2 = std::move(e1);      // moving is fine
    // Editor e3 = e2;              // error: unique_ptr can't be copied, so neither can Editor
    std::cout << e2.doc().title() << '\n';
}
```

```output
1 2
draft
```

Compare this with the raw-pointer `IntArray`: ~40 lines of careful code versus none. Only write the
five when you're building a resource-managing class yourself (and even then, consider wrapping the
resource in a `unique_ptr` with a custom deleter instead).

## Common mistakes

**Moving from something you still need.** After `v.push_back(std::move(s));`, don't keep reading `s`
as if it still held its old value.

**`std::move` on a `const` object.** `std::move(constObj)` produces `const T&&`, which can't bind to
`T&&`, so the **copy** constructor is chosen. No error, just a silent copy.

**`return std::move(local);`.** This *prevents* copy elision and is never faster. Just `return local;`.
GCC warns about it:

```cpp run warns
#include <iostream>
#include <string>
#include <utility>

std::string make() {
    std::string s = "hello";
    return std::move(s);   // warning: moving a local object in a return statement prevents copy elision
}

int main() {
    std::cout << make() << '\n';
}
```

**Forgetting `noexcept`.** Your class works, but vectors of it copy instead of moving when they grow.

**Forgetting to reset the source.** A move constructor that copies the pointer but doesn't set
`other.data_ = nullptr` causes a double free.

:::quiz
What does `std::move(x)` actually do?

- [ ] Moves `x`'s contents to a new location in memory
- [x] Casts `x` to an rvalue reference so that move operations can be selected
- [ ] Destroys `x`
- [ ] Sets `x` to its default value

`std::move` is only a cast. Something must then *use* the rvalue (a move constructor, move assignment,
or an `&&` overload) for anything to be moved.
:::

:::quiz
Why should move constructors be marked `noexcept`?

- [ ] It's required for them to compile
- [ ] It makes the move itself run faster
- [x] Containers like `std::vector` only use the move during reallocation if it's `noexcept`; otherwise they copy
- [ ] It prevents the object from being moved twice

`std::vector` needs to keep its strong exception guarantee when it grows, so it uses
`std::move_if_noexcept`, which picks the copy if the move might throw.
:::

:::quiz
A class has a `std::string` member and a user-declared destructor `~C() {}`, and nothing else. What does `C b = std::move(a);` do?

- [ ] Moves the string
- [x] Copies the string, because the destructor suppressed the implicit move constructor
- [ ] Doesn't compile
- [ ] Leaves both `a` and `b` empty

Declaring a destructor stops the compiler from declaring move operations, so the rvalue falls back to
the (still generated) copy constructor. Add `C(C&&) = default;` etc. to fix it, or remove the
needless destructor.
:::

:::exercise Steal the buffer
`Buffer` owns a heap array and can't be copied. Its move constructor and move assignment are stubs that
do nothing. Implement them properly (both `noexcept`):

- The **move constructor** takes `other`'s pointer and size, then leaves `other` empty (`nullptr`, size 0).
- The **move assignment** frees the current array, takes `other`'s, and leaves `other` empty.

**Input:** `n`, then `n` integers.
**Output:** the four lines printed by `main` (sizes and sums after each move). For `3` / `1 2 3`:

```
a: size 0
b: size 3, sum 6
b: size 0
c: size 3, sum 6
```

```cpp starter
#include <cstddef>
#include <iostream>
#include <utility>

class Buffer {
    int* data_ = nullptr;
    std::size_t size_ = 0;
public:
    Buffer() = default;
    explicit Buffer(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~Buffer() { delete[] data_; }

    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;

    Buffer(Buffer&& other) noexcept {
        (void)other;   // TODO: steal other's array
    }
    Buffer& operator=(Buffer&& other) noexcept {
        (void)other;   // TODO: free ours, steal other's
        return *this;
    }

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
    long long sum() const {
        long long s = 0;
        for (std::size_t i = 0; i < size_; ++i) s += data_[i];
        return s;
    }
};

int main() {
    std::size_t n;
    std::cin >> n;
    Buffer a(n);
    for (std::size_t i = 0; i < n; ++i) std::cin >> a[i];

    Buffer b = std::move(a);
    std::cout << "a: size " << a.size() << '\n';
    std::cout << "b: size " << b.size() << ", sum " << b.sum() << '\n';

    Buffer c(2);
    c = std::move(b);
    std::cout << "b: size " << b.size() << '\n';
    std::cout << "c: size " << c.size() << ", sum " << c.sum() << '\n';
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <utility>

class Buffer {
    int* data_ = nullptr;
    std::size_t size_ = 0;
public:
    Buffer() = default;
    explicit Buffer(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~Buffer() { delete[] data_; }

    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;

    Buffer(Buffer&& other) noexcept
        : data_(std::exchange(other.data_, nullptr)), size_(std::exchange(other.size_, 0)) {}

    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = std::exchange(other.data_, nullptr);
            size_ = std::exchange(other.size_, 0);
        }
        return *this;
    }

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
    long long sum() const {
        long long s = 0;
        for (std::size_t i = 0; i < size_; ++i) s += data_[i];
        return s;
    }
};

int main() {
    std::size_t n;
    std::cin >> n;
    Buffer a(n);
    for (std::size_t i = 0; i < n; ++i) std::cin >> a[i];

    Buffer b = std::move(a);
    std::cout << "a: size " << a.size() << '\n';
    std::cout << "b: size " << b.size() << ", sum " << b.sum() << '\n';

    Buffer c(2);
    c = std::move(b);
    std::cout << "b: size " << b.size() << '\n';
    std::cout << "c: size " << c.size() << ", sum " << c.sum() << '\n';
}
```

```hint
Move constructor: `: data_(other.data_), size_(other.size_) { other.data_ = nullptr; other.size_ = 0; }`. Or use `std::exchange`.
```

```hint
Move assignment: guard with `if (this != &other)`, `delete[] data_;`, then steal and reset exactly like the constructor. Return `*this`.
```

```stdin
3
1 2 3
```

```expected
a: size 0
b: size 3, sum 6
b: size 0
c: size 3, sum 6
```

```stdin
0
```

```expected hidden
a: size 0
b: size 0, sum 0
b: size 0
c: size 0, sum 0
```

```stdin
5
-10 20 -30 40 -50
```

```expected hidden
a: size 0
b: size 5, sum -30
b: size 0
c: size 5, sum -30
```

```checks
must Buffer\s*\(\s*Buffer\s*&&\s*\w+\s*\)\s*noexcept :: Keep the move constructor noexcept.
must operator\s*=\s*\(\s*Buffer\s*&&\s*\w+\s*\)\s*noexcept :: Keep the move assignment noexcept.
must delete\s*\[\s*\]\s*data_\s*;[\s\S]*delete\s*\[\s*\]\s*data_ :: Free the old array in the move assignment (delete[] data_).
```
:::

:::exercise Move it, don't copy it
`Tracked` counts how often it is copied and moved. Right now it has only a copy constructor, and `main`
copies every object into the vector. Make it zero-copy:

1. Add a **`noexcept` move constructor** that moves the name (use `std::move(other.name_)`) and increments `moves`.
2. In `main`, **move** each object into the vector with `std::move`.

**Input:** `n`, then `n` names.
**Output:** the names in the vector separated by spaces (an empty line when `n` is 0), then
`copies: C` and `moves: M`.

```cpp starter
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Tracked {
    std::string name_;
public:
    inline static int copies = 0;
    inline static int moves = 0;

    explicit Tracked(std::string name) : name_(std::move(name)) {}
    Tracked(const Tracked& other) : name_(other.name_) { ++copies; }
    // add a noexcept move constructor

    const std::string& name() const { return name_; }
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Tracked> v;
    v.reserve(n);
    for (int i = 0; i < n; ++i) {
        std::string name;
        std::cin >> name;
        Tracked t(name);
        v.push_back(t);          // copies! move it instead
    }
    for (int i = 0; i < n; ++i) std::cout << (i ? " " : "") << v[i].name();
    std::cout << '\n';
    std::cout << "copies: " << Tracked::copies << '\n';
    std::cout << "moves: " << Tracked::moves << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Tracked {
    std::string name_;
public:
    inline static int copies = 0;
    inline static int moves = 0;

    explicit Tracked(std::string name) : name_(std::move(name)) {}
    Tracked(const Tracked& other) : name_(other.name_) { ++copies; }
    Tracked(Tracked&& other) noexcept : name_(std::move(other.name_)) { ++moves; }

    const std::string& name() const { return name_; }
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Tracked> v;
    v.reserve(n);
    for (int i = 0; i < n; ++i) {
        std::string name;
        std::cin >> name;
        Tracked t(name);
        v.push_back(std::move(t));
    }
    for (int i = 0; i < n; ++i) std::cout << (i ? " " : "") << v[i].name();
    std::cout << '\n';
    std::cout << "copies: " << Tracked::copies << '\n';
    std::cout << "moves: " << Tracked::moves << '\n';
}
```

```hint
`Tracked(Tracked&& other) noexcept : name_(std::move(other.name_)) { ++moves; }`
```

```hint
`v.push_back(std::move(t));` picks the `push_back(T&&)` overload, which uses your move constructor.
```

```stdin
3
ann bob cy
```

```expected
ann bob cy
copies: 0
moves: 3
```

```stdin
1
solo
```

```expected hidden
solo
copies: 0
moves: 1
```

```checks
must Tracked\s*\(\s*Tracked\s*&&\s*\w+\s*\)\s*noexcept :: Write a noexcept move constructor Tracked(Tracked&&).
must push_back\s*\(\s*std::move\s*\( :: Move each object into the vector with std::move.
```
:::

:::exercise Rule of zero playlist
This `Playlist` manages a raw `std::string*` array by hand, has a destructor, and no copy operations,
so copying it is broken. Instead of writing all five special members, apply the **rule of zero**:
store the songs in a `std::vector<std::string>` and **delete the destructor and every `new`/`delete`**.
The generated copy and move operations will then be correct.

**Input:** a playlist name, then song names until end of input (possibly none).
**Output:** two lines printed by `main`: the moved playlist, then the edited copy. Each line is the name,
a colon, and each song preceded by a space. For `mix a b`:

```
mix: a b
mix-copy: a b bonus
```

```cpp starter
#include <cstddef>
#include <iostream>
#include <string>
#include <utility>

class Playlist {
    std::string name_;
    std::string* songs_ = nullptr;
    std::size_t count_ = 0;
public:
    explicit Playlist(std::string name) : name_(std::move(name)) {}
    ~Playlist() { delete[] songs_; }

    void add(const std::string& song) {
        std::string* bigger = new std::string[count_ + 1];
        for (std::size_t i = 0; i < count_; ++i) bigger[i] = songs_[i];
        bigger[count_] = song;
        delete[] songs_;
        songs_ = bigger;
        ++count_;
    }
    void rename(const std::string& name) { name_ = name; }
    void print() const {
        std::cout << name_ << ':';
        for (std::size_t i = 0; i < count_; ++i) std::cout << ' ' << songs_[i];
        std::cout << '\n';
    }
};

int main() {
    std::string name, song;
    std::cin >> name;
    Playlist original(name);
    while (std::cin >> song) original.add(song);

    Playlist copy = original;
    copy.rename(name + "-copy");
    copy.add("bonus");

    Playlist moved = std::move(original);
    moved.print();
    copy.print();
}
```

```cpp solution
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Playlist {
    std::string name_;
    std::vector<std::string> songs_;
public:
    explicit Playlist(std::string name) : name_(std::move(name)) {}

    void add(const std::string& song) { songs_.push_back(song); }
    void rename(const std::string& name) { name_ = name; }
    void print() const {
        std::cout << name_ << ':';
        for (const auto& s : songs_) std::cout << ' ' << s;
        std::cout << '\n';
    }
};

int main() {
    std::string name, song;
    std::cin >> name;
    Playlist original(name);
    while (std::cin >> song) original.add(song);

    Playlist copy = original;
    copy.rename(name + "-copy");
    copy.add("bonus");

    Playlist moved = std::move(original);
    moved.print();
    copy.print();
}
```

```hint
Replace `std::string* songs_` and `count_` with `std::vector<std::string> songs_;`. Then `add` is just `songs_.push_back(song);`.
```

```hint
Remove the destructor entirely. A vector frees its own memory.
```

```stdin
mix a b
```

```expected
mix: a b
mix-copy: a b bonus
```

```stdin
empty
```

```expected hidden
empty:
empty-copy: bonus
```

```stdin
road trip song1 song2 song3
```

```expected hidden
road: trip song1 song2 song3
road-copy: trip song1 song2 song3 bonus
```

```checks
must std::vector\s*<\s*std::string\s*> :: Store the songs in a std::vector<std::string>.
mustnot \bnew\b :: The rule of zero means no manual new.
mustnot ~\s*Playlist :: Remove the destructor: the members clean up after themselves.
```
:::
