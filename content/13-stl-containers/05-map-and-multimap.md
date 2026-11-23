---
title: std::map & std::multimap
summary: Sorted key-value dictionaries: the surprising [] operator, at and find, every way to insert, iterating with structured bindings, counting frequencies, and multimap.
---

## Keys and values

A `std::map<Key, Value>` (header `<map>`) stores **key-value pairs**, sorted by key, with **unique
keys**. Think of a dictionary: look up a word (key), get its definition (value). Like `std::set`, it's a
balanced tree, so lookup, insertion and erasure are O(log n).

```cpp run
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> ages{
        {"Grace", 85},
        {"Ada", 36},
        {"Linus", 54},
    };
    ages["Bjarne"] = 73;          // insert a new pair
    ages["Ada"] = 37;             // update an existing value

    std::cout << "Ada is " << ages["Ada"] << '\n';
    std::cout << ages.size() << " people\n";

    for (const auto& [name, age] : ages) {         // sorted by key
        std::cout << name << ": " << age << '\n';
    }
}
```

```output
Ada is 37
4 people
Ada: 37
Bjarne: 73
Grace: 85
Linus: 54
```

Each element is a `std::pair<const Key, Value>`: `.first` is the key (const, because changing it would
break the ordering) and `.second` is the value. Structured bindings, `auto& [name, age]`, unpack the pair
into readable names. Without them:

```cpp
for (const auto& entry : ages) {
    std::cout << entry.first << ": " << entry.second << '\n';
}
```

## `[]` inserts! `at` and `find` don't

`m[key]` is convenient, but it has a surprising rule: **if the key isn't there, it inserts it** with a
default-constructed value (`0` for numbers, `""` for strings) and returns a reference to that new value.

```cpp run
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> stock{{"apples", 5}};

    std::cout << stock["pears"] << '\n';      // prints 0... and inserts "pears"!
    std::cout << stock.size() << '\n';        // 2 now
}
```

```output
0
2
```

Just *reading* with `[]` changes the map. That's handy for counting (see below), but a bug when you only
meant to look. It also means `[]` can't be used on a **const** map:

```cpp compile-error
#include <map>
#include <string>

int lookup(const std::map<std::string, int>& m) {
    return m["key"];     // error: passing 'const std::map<...>' as 'this' argument discards qualifiers
}

int main() {}
```

For lookups, use one of these:

| Expression | Missing key | Returns |
| --- | --- | --- |
| `m[key]` | **inserts** a default value | reference to the value |
| `m.at(key)` | throws `std::out_of_range` | reference to the value |
| `m.find(key)` | returns `m.end()` | iterator to the pair |
| `m.contains(key)` (C++20) | `false` | `bool` |
| `m.count(key)` | `0` | `0` or `1` |

```cpp run
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>

int main() {
    const std::map<std::string, std::string> capitals{
        {"France", "Paris"}, {"Japan", "Tokyo"}};

    auto it = capitals.find("Japan");
    if (it != capitals.end()) {
        std::cout << it->first << " -> " << it->second << '\n';
    }

    if (!capitals.contains("Narnia")) std::cout << "Narnia not found\n";

    std::cout << capitals.at("France") << '\n';
    try {
        std::cout << capitals.at("Atlantis") << '\n';
    } catch (const std::out_of_range&) {
        std::cout << "at() threw out_of_range\n";
    }
    std::cout << capitals.size() << '\n';      // unchanged: lookups didn't insert
}
```

```output
Japan -> Tokyo
Narnia not found
Paris
at() threw out_of_range
2
```

The `find` pattern is the most efficient when you need the value afterwards: one O(log n) search, then
use the iterator. `contains` followed by `at` searches twice.

## Every way to insert

```cpp run
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<int, std::string> m;

    m[1] = "one";                                   // insert or overwrite

    auto [it, ok] = m.insert({2, "two"});           // only if absent; returns pair<iterator, bool>
    std::cout << it->second << ' ' << ok << '\n';

    auto r = m.insert({2, "TWO"});                  // key exists: nothing changes
    std::cout << r.first->second << ' ' << r.second << '\n';

    m.emplace(3, "three");                          // construct the pair in place (only if absent)

    m.try_emplace(4, 3, 'x');                       // C++17: args after the key construct the VALUE: std::string(3, 'x')
    m.try_emplace(1, "uno");                        // key exists: does nothing at all

    auto [it2, inserted] = m.insert_or_assign(2, "dos");   // C++17: insert, or overwrite if present
    std::cout << it2->second << ' ' << inserted << '\n';

    for (const auto& [k, v] : m) std::cout << k << '=' << v << ' ';
    std::cout << '\n';
}
```

```output
two 1
two 0
dos 0
1=one 2=dos 3=three 4=xxx
```

| Function | Key absent | Key present |
| --- | --- | --- |
| `m[k] = v` | inserts | overwrites |
| `insert({k, v})` | inserts | does nothing |
| `emplace(k, args...)` | inserts | does nothing (but may still build a temporary pair) |
| `try_emplace(k, args...)` | inserts, value built from `args` | does nothing, `args` untouched |
| `insert_or_assign(k, v)` | inserts | overwrites; tells you which happened |

`[]` also requires the value type to be default-constructible; `insert`, `emplace` and `try_emplace` don't.

## Counting and grouping

`[]`'s "insert a default" behavior is exactly what you want for counting: a new key starts at `0`, then
gets incremented.

```cpp run
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::istringstream text("the cat saw the dog and the dog saw the cat");
    std::map<std::string, int> freq;
    std::string word;
    while (text >> word) {
        ++freq[word];                 // missing word: inserted as 0, then incremented to 1
    }
    for (const auto& [w, count] : freq) std::cout << w << ' ' << count << '\n';

    // grouping: the value can be a container
    std::map<char, std::vector<std::string>> byLetter;
    for (std::string w : {"apple", "bob", "avocado", "cherry", "banana"}) {
        byLetter[w[0]].push_back(w);  // missing letter: inserted as an empty vector
    }
    for (const auto& [letter, words] : byLetter) {
        std::cout << letter << ':';
        for (const auto& w : words) std::cout << ' ' << w;
        std::cout << '\n';
    }
}
```

```output
and 1
cat 2
dog 2
saw 2
the 4
a: apple avocado
b: bob banana
c: cherry
```

(`std::istringstream` lets you read from a string as if it were `std::cin`. Here it just gives the
example some text without needing input.)

## Erasing and modifying

```cpp run
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> scores{{"amy", 3}, {"bob", 7}, {"cat", 1}, {"dan", 9}};

    scores.erase("bob");                             // by key: returns 1 or 0
    scores.erase(scores.begin());                    // by iterator: removes "amy"
    std::erase_if(scores, [](const auto& entry) {    // C++20: by condition
        return entry.second < 5;
    });

    for (auto& [name, score] : scores) score *= 10;  // values are modifiable through a non-const reference

    for (const auto& [name, score] : scores) std::cout << name << ' ' << score << '\n';
}
```

```output
dan 90
```

Maps also have `lower_bound`, `upper_bound` and `equal_range` **on keys**, exactly like sets, and you can
pass a custom comparator as the third template argument: `std::map<std::string, int, std::greater<std::string>>`.

## `std::multimap`: repeated keys

`std::multimap<Key, Value>` allows the **same key several times**. Elements with equal keys stay in the
order they were inserted. Because a key may map to many values, there is **no `[]` and no `at`**:

```cpp run
#include <iostream>
#include <map>
#include <string>

int main() {
    std::multimap<std::string, std::string> courses;
    courses.insert({"ada", "math"});
    courses.insert({"bob", "art"});
    courses.emplace("ada", "physics");
    courses.emplace("ada", "music");

    std::cout << "ada takes " << courses.count("ada") << " courses:";
    auto [first, last] = courses.equal_range("ada");
    for (auto it = first; it != last; ++it) std::cout << ' ' << it->second;
    std::cout << '\n';

    for (const auto& [student, course] : courses) std::cout << student << '/' << course << ' ';
    std::cout << '\n';
}
```

```output
ada takes 3 courses: math physics music
ada/math ada/physics ada/music bob/art
```

`equal_range(key)` returns a pair of iterators `[first, last)` covering all elements with that key. As
with `multiset`, `erase(key)` removes **all** of them.

Often a `std::map<Key, std::vector<Value>>` is simpler than a multimap, as in the grouping example above.
Use a multimap when you want one flat, sorted sequence of pairs.

## Common mistakes

- **Reading with `[]` when you meant to look up**: it silently inserts. Use `find`, `contains` or `at`.
- **`[]` on a const map**: doesn't compile.
- **Changing a key in place**: keys are `const`. Erase and re-insert (or use `extract`, C++17).
- **Expecting `insert` to overwrite**: it doesn't; use `[]` or `insert_or_assign`.
- **Forgetting `&` in `for (auto [k, v] : m)`**: it copies every pair, and modifying `v` changes only the copy.

:::quiz
What does this print?

```cpp
std::map<std::string, int> m;
if (m["x"] == 0) std::cout << m.size();
```

- [ ] `0`
- [x] `1`
- [ ] It throws an exception

`m["x"]` inserts the key `"x"` with value `0`, so the condition is true and the map now has one element.
:::

:::quiz
`m` is a `std::map<int, std::string>` that already contains key `5` with value `"a"`. Which calls change
that value to `"b"`? (select all that apply)

- [x] `m[5] = "b";`
- [ ] `m.insert({5, "b"});`
- [ ] `m.try_emplace(5, "b");`
- [x] `m.insert_or_assign(5, "b");`

`insert`, `emplace` and `try_emplace` never overwrite an existing key.
:::

:::exercise Word frequencies
Count how often each word occurs and print the counts in alphabetical order of the words.

**Input:** words separated by whitespace, until the input ends.
**Output:** one line per distinct word: `word count`, sorted alphabetically. If there are no words, print
nothing.

```cpp starter
#include <iostream>
#include <map>
#include <string>

int main() {
    std::string w;
    while (std::cin >> w) {
        std::cout << w << " 1\n";
    }
}
```

```cpp solution
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> freq;
    std::string w;
    while (std::cin >> w) ++freq[w];
    for (const auto& [word, count] : freq) {
        std::cout << word << ' ' << count << '\n';
    }
}
```

```hint
`++freq[w];` inserts a new word with count 0 and then increments it.
```

```hint
A `std::map` is already sorted by key, so iterate it with `for (const auto& [word, count] : freq)`.
```

```stdin
b a b c a b
```

```expected
a 2
b 3
c 1
```

```stdin
Zoo zoo Zoo
```

```expected hidden
Zoo 2
zoo 1
```

```stdin
```

```expected hidden
```

```checks
must std::map :: Use a std::map.
```
:::

:::exercise Phone book lookup
Store names and phone numbers in a `std::map`, then answer lookups **without inserting** missing names.
Use `find` (or `contains` and `at`), not `[]`, for the lookups.

**Input:** `n`, then `n` lines `name number`; then `q`, then `q` names to look up.
**Output:** one line per lookup: `name: number`, or `name: unknown`. Then a final line `entries: N`
with the size of the phone book (which must not have grown).

```cpp starter
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, std::string> book;
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string name, number;
        std::cin >> name >> number;
        book[name] = number;
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        std::string name;
        std::cin >> name;
        std::cout << name << ": " << book[name] << '\n';
    }
    std::cout << "entries: " << book.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, std::string> book;
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string name, number;
        std::cin >> name >> number;
        book[name] = number;
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        std::string name;
        std::cin >> name;
        auto it = book.find(name);
        std::cout << name << ": " << (it != book.end() ? it->second : "unknown") << '\n';
    }
    std::cout << "entries: " << book.size() << '\n';
}
```

```hint
`auto it = book.find(name);` then `it == book.end()` means the name isn't there. `it->second` is the number.
```

```stdin
2
alice 555-1234
bob 555-9876
3
bob
carol
alice
```

```expected
bob: 555-9876
carol: unknown
alice: 555-1234
entries: 2
```

```stdin
0
2
x
x
```

```expected hidden
x: unknown
x: unknown
entries: 0
```

```checks
must std::map :: Use a std::map.
must \.find\s*\(|\.contains\s*\( :: Look names up with find (or contains).
```
:::

:::exercise Group by first letter
Group words by their first letter using a `std::map<char, std::vector<std::string>>`. Within a group,
keep the words in input order.

**Input:** words separated by whitespace, until the input ends.
**Output:** one line per letter in alphabetical order: the letter, a colon, then the words of that group,
each preceded by a space. Example: `a: apple avocado`.

```cpp starter
#include <iostream>
#include <map>
#include <string>
#include <vector>

int main() {
    std::string w;
    while (std::cin >> w) {
        std::cout << w[0] << ": " << w << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <map>
#include <string>
#include <vector>

int main() {
    std::map<char, std::vector<std::string>> groups;
    std::string w;
    while (std::cin >> w) groups[w[0]].push_back(w);
    for (const auto& [letter, words] : groups) {
        std::cout << letter << ':';
        for (const auto& word : words) std::cout << ' ' << word;
        std::cout << '\n';
    }
}
```

```hint
`groups[w[0]].push_back(w);` creates an empty vector the first time a letter appears.
```

```stdin
banana apple cherry avocado blueberry
```

```expected
a: apple avocado
b: banana blueberry
c: cherry
```

```stdin
zed
```

```expected hidden
z: zed
```

```checks
must std::map\s*<\s*char\s*,\s*std::vector :: Use std::map<char, std::vector<std::string>>.
```
:::

:::exercise Course enrollments
Store `student course` enrollments in a `std::multimap<std::string, std::string>` (a student can have many
courses). Then, for each queried student, list their courses in the order they were enrolled, using
`equal_range`.

**Input:** `n`, then `n` lines `student course`; then `q`, then `q` student names.
**Output:** one line per query: `student (K):` followed by each course preceded by a space, where `K` is
the number of courses. A student with no courses prints `student (0):`.

```cpp starter
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, std::string> enrolled;
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string s, c;
        std::cin >> s >> c;
        enrolled[s] = c;
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        std::string s;
        std::cin >> s;
        std::cout << s << " (" << enrolled.count(s) << "):";
        if (enrolled.contains(s)) std::cout << ' ' << enrolled.at(s);
        std::cout << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <map>
#include <string>

int main() {
    std::multimap<std::string, std::string> enrolled;
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string s, c;
        std::cin >> s >> c;
        enrolled.emplace(s, c);
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        std::string s;
        std::cin >> s;
        auto [first, last] = enrolled.equal_range(s);
        std::cout << s << " (" << enrolled.count(s) << "):";
        for (auto it = first; it != last; ++it) std::cout << ' ' << it->second;
        std::cout << '\n';
    }
}
```

```hint
A multimap has no `[]`. Insert with `enrolled.emplace(s, c);` or `enrolled.insert({s, c});`.
```

```hint
`auto [first, last] = enrolled.equal_range(s);` gives the range of all of `s`'s entries, in insertion order.
```

```stdin
5
ada math
bob art
ada physics
cy chem
ada music
3
ada
bob
dan
```

```expected
ada (3): math physics music
bob (1): art
dan (0):
```

```stdin
2
x a
x a
1
x
```

```expected hidden
x (2): a a
```

```checks
must std::multimap :: Use a std::multimap.
must \.equal_range\s*\( :: Use equal_range.
```
:::
