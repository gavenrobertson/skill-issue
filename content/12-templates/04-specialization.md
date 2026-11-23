---
title: Template Specialization
summary: Give a template a custom version for specific types (full specialization), for whole families of types (partial specialization), and know when a plain overload is the better tool.
---

## One recipe doesn't always fit

A template says "do the same thing for every type". Sometimes one type needs different treatment:
`bool` should print as `true`/`false` rather than `1`/`0`, pointers should print what they point to,
`std::vector<bool>` might want to pack bits. **Specialization** lets you provide a custom version of a
template for particular template arguments, while every other type keeps using the general one (called
the **primary template**).

## Full specialization of a function template

```cpp run
#include <iostream>
#include <string>

// primary template
template <typename T>
std::string describe(const T& value) {
    return "value " + std::to_string(value);
}

// full specialization for bool
template <>
std::string describe<bool>(const bool& value) {
    return value ? "yes" : "no";
}

// same thing, letting the compiler deduce the <std::string> part
template <>
std::string describe(const std::string& value) {
    return "text \"" + value + "\"";
}

int main() {
    std::cout << describe(42) << '\n';                    // primary, T = int
    std::cout << describe(2.5) << '\n';                   // primary, T = double
    std::cout << describe(true) << '\n';                  // specialization
    std::cout << describe(std::string("hi")) << '\n';     // specialization
}
```

```output
value 42
value 2.500000
yes
text "hi"
```

The syntax:

- `template <>` with **empty** angle brackets: there are no parameters left, everything is fixed.
- The function signature must match the primary template with `T` replaced. Here the primary takes
  `const T&`, so the `bool` version takes `const bool&` (not `bool`).
- `describe<bool>` names which specialization this is. The `<bool>` may be omitted when the compiler can
  deduce it from the parameter types.

The specialization must appear **after** the primary template and **before** any call that would use it.

## Full specialization of a class template

For a class template, a specialization is an entirely separate class definition. It doesn't inherit
anything from the primary template: it can have different members, a different size, anything.

```cpp run
#include <iostream>
#include <string>

template <typename T>
class Printer {
public:
    static void print(const T& value) { std::cout << value << '\n'; }
};

template <>
class Printer<bool> {
public:
    static void print(bool value) { std::cout << (value ? "true" : "false") << '\n'; }
    static constexpr const char* note = "special bool printer";   // extra member
};

int main() {
    Printer<int>::print(7);
    Printer<std::string>::print("seven");
    Printer<bool>::print(true);
    std::cout << Printer<bool>::note << '\n';
}
```

```output
7
seven
true
special bool printer
```

`Printer<int>` has no `note` member; only the `bool` specialization does. The standard library does
exactly this with `std::vector<bool>`, which is a (partial) specialization that stores bits instead of `bool`s
(we'll meet its quirks in the next module).

You can also specialize a single member function of a class template without rewriting the whole class:

```cpp
template <>
void Printer<char>::print(const char& value) { std::cout << '\'' << value << "'\n"; }
```

## Partial specialization (class templates only)

A **partial specialization** handles a whole *family* of types: "all pointers", "every
`std::vector<something>`", "pairs where both types are the same". It still has template parameters, but
the argument list after the class name has a **pattern**:

```cpp run
#include <iostream>
#include <string>
#include <vector>

template <typename T>
struct Kind {                                   // primary: anything else
    static std::string name() { return "something"; }
};

template <typename T>
struct Kind<T*> {                               // any pointer
    static std::string name() { return "pointer to " + Kind<T>::name(); }
};

template <typename T>
struct Kind<std::vector<T>> {                   // any vector
    static std::string name() { return "vector of " + Kind<T>::name(); }
};

template <>
struct Kind<int> {                              // full specialization still allowed
    static std::string name() { return "int"; }
};

int main() {
    std::cout << Kind<double>::name() << '\n';
    std::cout << Kind<int>::name() << '\n';
    std::cout << Kind<int*>::name() << '\n';
    std::cout << Kind<std::vector<int>>::name() << '\n';
    std::cout << Kind<std::vector<int*>*>::name() << '\n';
}
```

```output
something
int
pointer to int
vector of int
pointer to vector of pointer to int
```

When you use `Kind<int*>`, the compiler checks which specializations match the pattern and picks the
**most specialized** one. `int*` matches `Kind<T*>` with `T = int`; inside it, `Kind<T>::name()` recurses
with `T = int`, which hits the full specialization.

Patterns can also relate several parameters. Here is how `std::is_same` (next lessons) is implemented:

```cpp run
#include <iostream>

template <typename A, typename B>
struct IsSame { static constexpr bool value = false; };

template <typename T>
struct IsSame<T, T> { static constexpr bool value = true; };   // both the same

int main() {
    std::cout << IsSame<int, int>::value << IsSame<int, double>::value
              << IsSame<char, char>::value << '\n';
}
```

```output
101
```

## Function templates cannot be partially specialized

Partial specialization only exists for **class** (and variable) templates. Trying it with a function is
an error:

```cpp compile-error
#include <iostream>

template <typename T>
void show(T value) { std::cout << value << '\n'; }

template <typename T>
void show<T*>(T* ptr) { std::cout << *ptr << '\n'; }   // error: function template partial specialization is not allowed

int main() {}
```

For functions, the tool is **overloading**. Just write another template (or a plain function) with a
different parameter list:

```cpp run
#include <iostream>

template <typename T>
void show(T value) { std::cout << "value: " << value << '\n'; }

template <typename T>
void show(T* ptr) { std::cout << "points to: " << *ptr << '\n'; }   // overload, not specialization

void show(bool b) { std::cout << "bool: " << (b ? "true" : "false") << '\n'; }   // plain overload

int main() {
    int x = 5;
    show(x);
    show(&x);
    show(false);
}
```

```output
value: 5
points to: 5
bool: false
```

The compiler picks the best match using normal overload resolution: `show(T*)` is more specialized than
`show(T)` for a pointer, and the non-template `show(bool)` beats a template for an exact match.

## Why overloading usually beats function specialization

Full specializations of function templates **do not take part in overload resolution**. The compiler
first chooses among the *primary* templates and plain functions; only after picking a primary template
does it look for a specialization *of that template*. This leads to surprises:

```cpp run
#include <iostream>

template <typename T>
void f(T) { std::cout << "f(T)\n"; }

template <typename T>
void f(T*) { std::cout << "f(T*)\n"; }

template <>
void f<int*>(int*) { std::cout << "specialization for int*\n"; }   // specializes f(T) with T = int*

int main() {
    int x = 0;
    f(&x);    // you might expect the specialization...
}
```

```output
f(T*)
```

Overload resolution compared `f(T)` and `f(T*)` and picked the more specialized `f(T*)`. The
`int*` specialization belongs to `f(T)`, which lost, so it was never considered. Had you written a
plain overload `void f(int*)` instead, it would have won.

**Rule of thumb:**

- For **functions**: prefer plain overloads (or overloaded templates). Use a full specialization only
  when you can't overload, for example when the type appears only in the return type.
- For **classes**: use full and partial specializations freely; that's what they are for.

## Common mistakes

- **Specializing before the primary template exists**: the primary must be declared first.
- **Using a type before its specialization is declared**: if `Printer<bool>` is used first, the primary
  gets instantiated, and a later specialization is an error ("specialization after instantiation").
- **Signature mismatch**: the specialization's parameters must be exactly the primary's with `T`
  substituted (`const T&` becomes `const bool&`).
- **Assuming the specialization shares code**: a class specialization starts from nothing; members of the
  primary template are not available in it.

:::quiz
Which of these are allowed? (select all that apply)

- [x] Full specialization of a function template
- [ ] Partial specialization of a function template
- [x] Full specialization of a class template
- [x] Partial specialization of a class template

Function templates can only be fully specialized; for "partial" behavior you overload them instead.
:::

:::quiz
Given the code below, what does `Holder<int*>::id` equal?

```cpp
template <typename T>          struct Holder        { static constexpr int id = 1; };
template <typename T>          struct Holder<T*>    { static constexpr int id = 2; };
template <>                    struct Holder<int*>  { static constexpr int id = 3; };
```

- [ ] 1
- [ ] 2
- [x] 3
- [ ] It's ambiguous and doesn't compile

All three could match, and the compiler picks the most specialized. A full specialization for exactly
`int*` beats the partial specialization for "any pointer".
:::

:::exercise Show with specializations {easy}
Write a function template `template <typename T> std::string show(const T& value)` that returns
`std::to_string(value)`. Then add **full specializations** so that:

- `show<bool>` returns `true` or `false`,
- `show<std::string>` returns the text wrapped in double quotes.

**Input:** an integer, then a `0` or `1` (read it into a `bool`), then a word.
**Output:** three lines: `show` of the integer, of the bool, and of the word.

```cpp starter
#include <iostream>
#include <string>

template <typename T>
std::string show(const T& value) {
    return std::to_string(value);
}

int main() {
    int i;
    bool b;
    std::string w;
    std::cin >> i >> b >> w;
    std::cout << show(i) << '\n';
    std::cout << show(static_cast<int>(b)) << '\n';
    std::cout << w << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

template <typename T>
std::string show(const T& value) {
    return std::to_string(value);
}

template <>
std::string show<bool>(const bool& value) {
    return value ? "true" : "false";
}

template <>
std::string show<std::string>(const std::string& value) {
    return "\"" + value + "\"";
}

int main() {
    int i;
    bool b;
    std::string w;
    std::cin >> i >> b >> w;
    std::cout << show(i) << '\n';
    std::cout << show(b) << '\n';
    std::cout << show(w) << '\n';
}
```

```hint
A full specialization starts with `template <>` and repeats the signature with `T` replaced:
`template <> std::string show<bool>(const bool& value) { ... }`.
```

```hint
`std::to_string` doesn't accept a `std::string`, so without the specialization `show(w)` would not even
compile. The specialization is what makes it work.
```

```stdin
42 1 hi
```

```expected
42
true
"hi"
```

```stdin
-7 0 C++
```

```expected hidden
-7
false
"C++"
```

```stdin
0 1 x
```

```expected hidden
0
true
"x"
```

```checks
must template\s*<\s*>[\s\S]*template\s*<\s*> :: Write two full specializations with template <>.
must show\s*\(\s*b\s*\) :: Call show(b) on the bool itself.
```
:::

:::exercise Describe vectors and pointers {medium}
Here is a primary class template:

```cpp
template <typename T>
struct Describer {
    static std::string describe(const T& value) { return std::to_string(value); }
};
```

Add two **partial specializations**:

- `Describer<std::vector<T>>` returns the elements described one by one, separated by `, ` inside
  square brackets, like `[1, 2, 3]` (an empty vector gives `[]`).
- `Describer<T*>` returns `ptr->` followed by the description of what the pointer points to.

**Input:** an integer `x`, then `n`, then `n` integers.
**Output:** four lines: the description of `x`, of the vector, of `&x`, and of a pointer to the vector.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

template <typename T>
struct Describer {
    static std::string describe(const T& value) { return std::to_string(value); }
};

// add the partial specializations here

int main() {
    int x, n;
    std::cin >> x >> n;
    std::vector<int> v(n);
    for (int& e : v) std::cin >> e;
    std::cout << Describer<int>::describe(x) << '\n';
    // print the vector, &x and &v descriptions
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

template <typename T>
struct Describer {
    static std::string describe(const T& value) { return std::to_string(value); }
};

template <typename T>
struct Describer<std::vector<T>> {
    static std::string describe(const std::vector<T>& v) {
        std::string out = "[";
        for (std::size_t i = 0; i < v.size(); ++i) {
            if (i > 0) out += ", ";
            out += Describer<T>::describe(v[i]);
        }
        return out + "]";
    }
};

template <typename T>
struct Describer<T*> {
    static std::string describe(T* const& p) {
        return "ptr->" + Describer<T>::describe(*p);
    }
};

int main() {
    int x, n;
    std::cin >> x >> n;
    std::vector<int> v(n);
    for (int& e : v) std::cin >> e;
    std::cout << Describer<int>::describe(x) << '\n';
    std::cout << Describer<std::vector<int>>::describe(v) << '\n';
    std::cout << Describer<int*>::describe(&x) << '\n';
    std::cout << Describer<std::vector<int>*>::describe(&v) << '\n';
}
```

```hint
The pattern goes after the class name: `template <typename T> struct Describer<std::vector<T>> { ... };`
and `template <typename T> struct Describer<T*> { ... };`.
```

```hint
Reuse the other descriptions: inside the vector version call `Describer<T>::describe(v[i])`, and inside
the pointer version call `Describer<T>::describe(*p)`. The pointer parameter can simply be `T* p`.
```

```stdin
7 3 1 2 3
```

```expected
7
[1, 2, 3]
ptr->7
ptr->[1, 2, 3]
```

```stdin
-1 0
```

```expected hidden
-1
[]
ptr->-1
ptr->[]
```

```stdin
5 1 -3
```

```expected hidden
5
[-3]
ptr->5
ptr->[-3]
```

```checks
must Describer\s*<\s*std::vector\s*<\s*T\s*>\s*> :: Write a partial specialization Describer<std::vector<T>>.
must Describer\s*<\s*T\s*\*\s*> :: Write a partial specialization Describer<T*>.
```
:::

:::exercise Overload instead of specializing {medium}
Write a function template `best(const std::vector<T>& v)` that returns the largest element. Then make
`best` of a `std::vector<std::string>` return the **longest** word instead (the first one if several
are equally long). Do this with a plain **overload**, not a specialization.

**Input:** `n` and `n` integers, then `m` and `m` words (`n` and `m` are at least 1).
**Output:** two lines: `best` of the integers and `best` of the words.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

template <typename T>
T best(const std::vector<T>& v) {
    T result = v[0];
    for (const T& x : v)
        if (result < x) result = x;
    return result;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> nums(n);
    for (int& x : nums) std::cin >> x;
    int m;
    std::cin >> m;
    std::vector<std::string> words(m);
    for (auto& w : words) std::cin >> w;
    std::cout << best(nums) << '\n';
    std::cout << best(words) << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

template <typename T>
T best(const std::vector<T>& v) {
    T result = v[0];
    for (const T& x : v)
        if (result < x) result = x;
    return result;
}

std::string best(const std::vector<std::string>& v) {
    std::string result = v[0];
    for (const std::string& w : v)
        if (w.size() > result.size()) result = w;
    return result;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> nums(n);
    for (int& x : nums) std::cin >> x;
    int m;
    std::cin >> m;
    std::vector<std::string> words(m);
    for (auto& w : words) std::cin >> w;
    std::cout << best(nums) << '\n';
    std::cout << best(words) << '\n';
}
```

```hint
Add an ordinary function `std::string best(const std::vector<std::string>& v)`. For an exact match, the
non-template function wins over the template.
```

```hint
Use `>` (not `>=`) when comparing lengths, so the first of several equally long words is kept.
```

```stdin
4 3 9 -2 9
4 hi hello yo world
```

```expected
9
hello
```

```stdin
1 -5
3 zz aa b
```

```expected hidden
-5
zz
```

```stdin
3 -1 -5 -3
3 ab cd abc
```

```expected hidden
-1
abc
```

```checks
must std::string\s+best\s*\(\s*const\s+std::vector\s*<\s*std::string\s*>\s*& :: Write a plain overload taking const std::vector<std::string>&.
mustnot template\s*<\s*> :: Use an overload, not a template <> specialization.
```
:::

:::exercise Read anything {hard}
Build a tiny input library with specializations. The primary template reads any type that
`operator>>` understands:

```cpp
template <typename T>
struct Reader {
    static T read(std::istream& in) { T value{}; in >> value; return value; }
};
```

Add:

- a **full specialization** `Reader<bool>` that reads the word `yes` or `no`,
- a **partial specialization** `Reader<std::vector<T>>` that reads a count `k` and then `k` elements,
  each with `Reader<T>` (so vectors of vectors, vectors of pairs, ... all work),
- a **partial specialization** `Reader<std::pair<A, B>>` that reads an `A` and then a `B`, each with
  its own `Reader`.

Then read, with **one call each**:

1. `Reader<std::vector<std::pair<std::string, std::vector<int>>>>::read(std::cin)`: teams, each a name
   and its list of scores,
2. `Reader<std::pair<bool, std::vector<double>>>::read(std::cin)`: a flag and some measurements.

**Input:** the two values in that format. Example:

```
2
ada 3 5 7 3
bob 0
yes 2 1.5 2.25
```

**Output:** one line per team, `name: TOTAL (K scores)` (a total can exceed the range of `int`); then `flag: true` or `flag: false`; then
`values:` followed by each measurement preceded by a space (just `values:` if there are none). For the
example:

```
ada: 15 (3 scores)
bob: 0 (0 scores)
flag: true
values: 1.5 2.25
```

```cpp starter
#include <iostream>
#include <string>
#include <utility>
#include <vector>

template <typename T>
struct Reader {
    static T read(std::istream& in) {
        T value{};
        in >> value;
        return value;
    }
};

// add Reader<bool>, Reader<std::vector<T>> and Reader<std::pair<A, B>> here

int main() {
    // auto teams = Reader<std::vector<std::pair<std::string, std::vector<int>>>>::read(std::cin);
    // auto data = Reader<std::pair<bool, std::vector<double>>>::read(std::cin);
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

template <typename T>
struct Reader {
    static T read(std::istream& in) {
        T value{};
        in >> value;
        return value;
    }
};

template <>
struct Reader<bool> {
    static bool read(std::istream& in) {
        std::string word;
        in >> word;
        return word == "yes";
    }
};

template <typename T>
struct Reader<std::vector<T>> {
    static std::vector<T> read(std::istream& in) {
        std::size_t k = Reader<std::size_t>::read(in);
        std::vector<T> result;
        for (std::size_t i = 0; i < k; ++i) result.push_back(Reader<T>::read(in));
        return result;
    }
};

template <typename A, typename B>
struct Reader<std::pair<A, B>> {
    static std::pair<A, B> read(std::istream& in) {
        A first = Reader<A>::read(in);      // separate statements: the order of reads matters
        B second = Reader<B>::read(in);
        return {first, second};
    }
};

int main() {
    auto teams = Reader<std::vector<std::pair<std::string, std::vector<int>>>>::read(std::cin);
    auto data = Reader<std::pair<bool, std::vector<double>>>::read(std::cin);

    for (const auto& [name, scores] : teams) {
        long long total = 0;
        for (int s : scores) total += s;
        std::cout << name << ": " << total << " (" << scores.size() << " scores)\n";
    }
    std::cout << "flag: " << (data.first ? "true" : "false") << '\n';
    std::cout << "values:";
    for (double v : data.second) std::cout << ' ' << v;
    std::cout << '\n';
}
```

```hint
The partial specializations look like `template <typename T> struct Reader<std::vector<T>> { ... };`
and `template <typename A, typename B> struct Reader<std::pair<A, B>> { ... };`. Inside, call
`Reader<T>::read(in)` (or `Reader<A>`, `Reader<B>`) for the parts: the compiler picks the right
specialization for each part, recursively.
```

```hint
In the pair reader, read `first` and `second` in **two separate statements**. In
`return {Reader<A>::read(in), Reader<B>::read(in)};` the order of the two reads is up to the compiler.
```

```hint
`std::vector<bool>` is never needed here, but `Reader<bool>` is: it's the `first` of the pair.
```

```stdin
2
ada 3 5 7 3
bob 0
yes 2 1.5 2.25
```

```expected
ada: 15 (3 scores)
bob: 0 (0 scores)
flag: true
values: 1.5 2.25
```

```stdin
0
no 0
```

```expected hidden
flag: false
values:
```

```stdin
3
zed 1 -5
amy 2 2000000000 2000000000
kim 4 1 1 1 1
no 3 -0.5 0 10
```

```expected hidden
zed: -5 (1 scores)
amy: 4000000000 (2 scores)
kim: 4 (4 scores)
flag: false
values: -0.5 0 10
```

```checks
must template\s*<\s*>\s*struct\s+Reader\s*<\s*bool\s*> :: Write the full specialization Reader<bool>.
must struct\s+Reader\s*<\s*std::vector\s*<\s*\w+\s*>\s*> :: Write the partial specialization Reader<std::vector<T>>.
must struct\s+Reader\s*<\s*std::pair\s*<\s*\w+\s*,\s*\w+\s*>\s*> :: Write the partial specialization Reader<std::pair<A, B>>.
must Reader\s*<\s*std::vector\s*<\s*std::pair :: Read the teams with a single Reader<std::vector<std::pair<...>>> call.
```
:::
