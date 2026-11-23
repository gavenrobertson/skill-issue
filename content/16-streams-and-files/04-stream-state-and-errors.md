---
title: Stream State & Error Handling
summary: The four state flags, how a stream converts to bool, recovering from bad input with clear() and ignore(), robust input loops, and a quick tour of std::filesystem.
---

## Every stream has a state

A stream remembers whether its last operations went well. The state is a set of three flags (plus
"no flags set"):

| Flag | Set when | Check with |
| --- | --- | --- |
| `goodbit` (no flags) | everything is fine | `s.good()` |
| `eofbit` | an operation reached the **end of input** | `s.eof()` |
| `failbit` | an operation **failed**: wrong format (`"abc"` into an `int`), out of range, nothing left to read, a file that wouldn't open | `s.fail()` (true if fail **or** bad) |
| `badbit` | a serious, usually unrecoverable error: the device itself failed (disk error, lost connection) | `s.bad()` |

`s.rdstate()` returns all the flags at once, and `s.clear()` resets them to `goodbit`.

The important rule: **once `failbit` is set, every further input operation does nothing** until you
call `clear()`. A failed stream is "stuck" on purpose, so you notice.

```cpp run
#include <iostream>
#include <sstream>

void report(const char* label, const std::istream& s) {
    std::cout << label << ": good=" << s.good() << " eof=" << s.eof()
              << " fail=" << s.fail() << " bad=" << s.bad() << '\n';
}

int main() {
    std::istringstream in("12 abc");
    int a = 0;
    int b = 7;

    in >> a;
    report("after 12   ", in);      // fine

    in >> b;                        // "abc" is not an int
    report("after abc  ", in);
    std::cout << "a=" << a << " b=" << b << '\n';   // b was set to 0 by the failed read

    in.clear();                     // un-stick the stream
    std::string word;
    in >> word;                     // now read the bad token as text
    report("after clear", in);      // reached the end of the string while reading "abc"
    std::cout << "word=" << word << '\n';
}
```

```output
after 12   : good=1 eof=0 fail=0 bad=0
after abc  : good=0 eof=0 fail=1 bad=0
a=12 b=0
after clear: good=0 eof=1 fail=0 bad=0
word=abc
```

Two details worth knowing:

- When a number fails to parse, the target is set to `0`. If the number is too big for the type,
  it's set to the type's maximum (or minimum) and `failbit` is set.
- Reading the **last** item can set `eofbit` without `failbit` (above: reading `abc` hit the end of the
  string, but `abc` was still read successfully). So `eof()` being true does **not** mean the last read failed.

## Streams convert to `bool`

A stream can be used as a condition. `if (s)` means `if (!s.fail())`, and `if (!s)` means
`if (s.fail())`. Since `>>` and `getline` return the stream, you can test the read itself:

```cpp
if (std::cin >> x) { /* x was read successfully */ }
while (std::getline(file, line)) { /* got a line */ }
if (!file) { /* opening (or the last operation) failed */ }
```

This is an `explicit operator bool`, so it works in conditions but you can't accidentally do arithmetic
with a stream:

```cpp compile-error
#include <iostream>

int main() {
    int n = std::cin + 1;   // error: no match for 'operator+': streams aren't numbers
    return n;
}
```

## The correct input loop

The idiomatic loop **reads first, then checks**, by putting the read in the condition:

```cpp
while (in >> x) {
    // use x: it's guaranteed to be a freshly read value
}
```

A very common bug is looping on `eof()` instead:

```cpp run
#include <iostream>
#include <sstream>

int main() {
    std::istringstream in("1 2 3\n");
    int x = 0;
    int count = 0;
    int sum = 0;
    while (!in.eof()) {          // WRONG: checks before reading
        in >> x;                 // the 4th read fails, x keeps its old value 3
        ++count;
        sum += x;
    }
    std::cout << "wrong loop: count=" << count << " sum=" << sum << '\n';

    std::istringstream again("1 2 3\n");
    count = 0;
    sum = 0;
    while (again >> x) {         // RIGHT: the read is the condition
        ++count;
        sum += x;
    }
    std::cout << "right loop: count=" << count << " sum=" << sum << '\n';
}
```

```output
wrong loop: count=4 sum=9
right loop: count=3 sum=6
```

After reading `3`, the stream hasn't hit the end yet (the `'\n'` is still there), so `eof()` is false
and the loop runs once more. That read fails, `x` is unchanged, and the last value is processed twice.
Worse, if the input contains a non-number, `eof()` never becomes true and the loop runs **forever**.

> **Pitfall:** `while (!in.eof())` and `while (in.good())` before reading are both wrong. Read, then test.

## Recovering from bad input: `clear()` and `ignore()`

When a user types `abc` where you expected a number, you usually want to complain and try again.
Two steps:

1. `in.clear()` resets the flags so the stream works again.
2. Remove the offending characters, which are **still in the stream**. Either read them into a
   throwaway string, or skip them with `ignore`:

```cpp
in.ignore(n, delim);   // discard up to n characters, stopping after delim
in.ignore(std::numeric_limits<std::streamsize>::max(), '\n');   // discard the rest of the line
```

```cpp run
#include <iostream>
#include <limits>
#include <sstream>

int main() {
    std::istringstream in("abc\n42 junk\n-3\n");   // pretend the user typed this
    int value;
    for (int attempt = 1; attempt <= 3; ++attempt) {
        if (in >> value) {
            std::cout << "attempt " << attempt << ": got " << value << '\n';
        } else {
            std::cout << "attempt " << attempt << ": not a number, try again\n";
            in.clear();                                                   // 1. reset flags
            in.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // 2. drop the bad line
        }
    }
}
```

```output
attempt 1: not a number, try again
attempt 2: got 42
attempt 3: not a number, try again
```

Attempt 3 surprised you? After `42` was read, `" junk\n-3"` was still waiting, and `junk` is not a
number. If each answer is supposed to be on its own line, the robust approach is to **read whole lines
and parse each line separately**:

```cpp run
#include <iostream>
#include <sstream>
#include <string>

// true if s holds exactly one int (surrounding spaces allowed)
bool parseWholeInt(const std::string& s, int& out) {
    std::istringstream in(s);
    int value;
    char extra;
    if (!(in >> value)) return false;   // no number
    if (in >> extra) return false;      // something after the number
    out = value;
    return true;
}

int main() {
    std::istringstream input("abc\n42 junk\n  -3  \n99999999999\n");
    std::string line;
    while (std::getline(input, line)) {
        int n;
        if (parseWholeInt(line, n)) std::cout << "ok: " << n << '\n';
        else std::cout << "rejected: \"" << line << "\"\n";
    }
}
```

```output
rejected: "abc"
rejected: "42 junk"
ok: -3
rejected: "99999999999"
```

`getline` + a per-line `std::istringstream` never leaves a stream stuck, and each line is judged on its own.

### The `getline` after `>>` trap

`std::cin >> n` leaves the `'\n'` after the number in the stream. A following `std::getline` then reads
an **empty** line. Skip leftover whitespace first with `std::ws` or `ignore`:

```cpp
int age;
std::string name;
std::cin >> age;
std::getline(std::cin >> std::ws, name);   // std::ws eats the leftover newline (and leading spaces)
```

## Streams that throw

By default streams never throw; you check the flags. You can ask a stream to throw a
`std::ios_base::failure` exception when certain flags get set:

```cpp run
#include <fstream>
#include <iostream>

int main() {
    std::ifstream in;
    in.exceptions(std::ios::failbit | std::ios::badbit);   // throw on failure
    try {
        in.open("no_such_file_here.txt");
        std::cout << "opened\n";
    } catch (const std::ios_base::failure&) {
        std::cout << "caught: could not open the file\n";
    }
}
```

```output
caught: could not open the file
```

This is handy for "the file must exist" situations, but awkward for normal read loops: reaching the end
of input sets `failbit` too, so the loop's final, expected read would throw. A common compromise is
`in.exceptions(std::ios::badbit)`: throw only on real device errors, and handle format errors and the
end of input with the usual checks.

## A quick tour of `std::filesystem`

Streams read and write a file's **contents**. To work with files and folders themselves (does it
exist? how big is it? what's in this directory?), C++17 added `<filesystem>`. Everything lives in
`std::filesystem`, which people usually shorten with a namespace alias:

```cpp
namespace fs = std::filesystem;
```

| Call | Does |
| --- | --- |
| `fs::path p = "dir/file.txt";` | a path; join parts with `/`: `fs::path("dir") / "file.txt"` |
| `p.filename()`, `p.stem()`, `p.extension()`, `p.parent_path()` | `file.txt`, `file`, `.txt`, `dir` |
| `fs::exists(p)` | does it exist? |
| `fs::is_regular_file(p)`, `fs::is_directory(p)` | what kind of thing is it? |
| `fs::file_size(p)` | size in bytes |
| `fs::create_directory(p)`, `fs::create_directories(p)` | make one folder / a whole chain |
| `fs::remove(p)`, `fs::remove_all(p)` | delete a file or empty folder / a whole tree |
| `fs::rename(from, to)`, `fs::copy_file(from, to)` | move / copy |
| `fs::directory_iterator(p)` | loop over a folder's entries |
| `fs::recursive_directory_iterator(p)` | ...including all subfolders |
| `fs::current_path()` | the working directory |

```cpp run
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

int main() {
    const fs::path dir = "fs_tour_demo";
    fs::create_directories(dir / "images");             // makes both folders
    std::ofstream(dir / "readme.txt") << "Hello!\n";
    std::ofstream(dir / "data.csv") << "a,b\n1,2\n";

    fs::path p = dir / "data.csv";
    std::cout << "path: " << p.string() << '\n';
    std::cout << "filename: " << p.filename().string()
              << ", stem: " << p.stem().string()
              << ", extension: " << p.extension().string() << '\n';
    std::cout << std::boolalpha << "exists: " << fs::exists(p)
              << ", missing exists: " << fs::exists(dir / "nope.txt") << '\n';

    // Directory order is unspecified, so collect and sort before printing.
    std::vector<std::string> lines;
    for (const fs::directory_entry& entry : fs::directory_iterator(dir)) {
        std::string name = entry.path().filename().string();
        if (entry.is_directory()) lines.push_back(name + "/");
        else lines.push_back(name + " (" + std::to_string(entry.file_size()) + " bytes)");
    }
    std::sort(lines.begin(), lines.end());
    for (const auto& line : lines) std::cout << "  " << line << '\n';

    std::cout << "removed " << fs::remove_all(dir) << " entries\n";
}
```

```output
path: fs_tour_demo/data.csv
filename: data.csv, stem: data, extension: .csv
exists: true, missing exists: false
  data.csv (8 bytes)
  images/
  readme.txt (7 bytes)
removed 4 entries
```

Filesystem functions report problems by throwing `fs::filesystem_error`. Most also have an overload
taking a `std::error_code&` that reports the error there instead of throwing:

```cpp
std::error_code ec;
auto size = fs::file_size("missing.txt", ec);
if (ec) std::cout << "error: " << ec.message() << '\n';   // e.g. "No such file or directory"
```

> **Note:** The order in which `directory_iterator` visits entries is unspecified (it depends on the
> operating system and file system). Always sort if order matters.

:::quiz
After `std::istringstream in("7"); int x; in >> x;` which is true?

- [x] `x == 7`, `in.eof()` is true, `in.fail()` is false
- [ ] `x == 7`, `in.eof()` is false
- [ ] `in.fail()` is true because the end was reached
- [ ] `x` is unspecified

Reading `7` ran into the end of the string, which sets `eofbit`, but the read itself succeeded, so
`failbit` is clear and the stream still converts to `true`.
:::

:::quiz
Your program reads `int n` with `std::cin >> n`, and the user typed `hello`. What must you do before reading again? (select all that apply)

- [x] Call `std::cin.clear()`
- [x] Remove `hello` from the stream (e.g. `ignore(...)` or read it into a string)
- [ ] Nothing, the next `>>` will skip it automatically
- [ ] Reopen `std::cin`

`clear()` resets `failbit` so reads work again, but the bad characters are still waiting in the
stream. If you don't discard them, the next `>>` fails on the same `hello`.
:::

:::quiz
Why is `while (!in.eof()) { in >> x; use(x); }` wrong?

- [ ] `eof()` doesn't exist on input streams
- [x] It checks before reading, so the failed read at the end is still "used", and bad input can loop forever
- [ ] It skips the first value
- [ ] It's correct

Read first, then check: `while (in >> x) use(x);`.
:::

:::exercise Sum the valid numbers
Read whitespace-separated tokens until the end of input. Tokens that are integers (as read by
`std::cin >> int`) are added to a sum; any token that makes the read fail is counted as invalid and
skipped. Use `std::cin.clear()` to recover, then read the bad token into a `std::string` to discard it.

**Output:**

```
sum: <sum of valid numbers>
invalid: <count of skipped tokens>
```

Note: `>>` reads a number prefix, so `12abc` is read as `12` followed by the invalid token `abc`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    long long sum = 0;
    int invalid = 0;
    long long x;
    while (std::cin >> x) {
        sum += x;
    }
    // this stops at the first bad token; make it skip bad tokens and continue
    std::cout << "sum: " << sum << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    long long sum = 0;
    int invalid = 0;
    long long x;
    while (true) {
        if (std::cin >> x) {
            sum += x;
        } else if (std::cin.eof()) {
            break;
        } else {
            std::cin.clear();
            std::string junk;
            std::cin >> junk;
            ++invalid;
        }
    }
    std::cout << "sum: " << sum << '\n';
    std::cout << "invalid: " << invalid << '\n';
}
```

```hint
When `std::cin >> x` fails, there are two cases: the input ended (`std::cin.eof()` is true), or there's
a bad token. Only the second one needs `clear()` and a throwaway `std::string`.
```

```stdin
10 apples 20 -5 pears
```

```expected
sum: 25
invalid: 2
```

```stdin
one two three
```

```expected hidden
sum: 0
invalid: 3
```

```stdin
12abc 3
```

```expected
sum: 15
invalid: 1
```

```expected
sum: 0
invalid: 0
```

```checks
must \.clear\s*\(\s*\) :: Recover the stream with std::cin.clear().
```
:::

:::exercise Validate each line
Each input line should contain exactly one integer between 0 and 150 (an age), optionally surrounded by
spaces. For each line print:

- `ok <n>` if it's valid,
- `not a number: <line>` if the line isn't exactly one integer (empty lines, `abc`, `12abc`, `1 2`...),
- `out of range: <n>` if it's an integer outside 0..150.

Parse each line with its own `std::istringstream`.

```cpp starter
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // parse line
    }
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        long long n;
        char extra;
        if (!(in >> n) || (in >> extra)) {
            std::cout << "not a number: " << line << '\n';
        } else if (n < 0 || n > 150) {
            std::cout << "out of range: " << n << '\n';
        } else {
            std::cout << "ok " << n << '\n';
        }
    }
}
```

```hint
Read the number, then try to read one more `char`. If that second read **succeeds**, there was junk
after the number.
```

```stdin
42
  7  
abc
12abc
200
```

```expected
ok 42
ok 7
not a number: abc
not a number: 12abc
out of range: 200
```

```stdin

-1
1 2
150
0
```

```expected hidden
not a number:
out of range: -1
not a number: 1 2
ok 150
ok 0
```

```checks
must istringstream|stringstream :: Parse each line with a std::istringstream.
```
:::

:::exercise Ask until valid
Simulate a prompt that keeps asking for a number from 1 to 10. Read with `std::cin >> n` repeatedly:

- if the read fails because of a non-number, print `Not a number`, then `clear()` the stream and
  `ignore()` the rest of that line,
- if the number is outside 1..10, print `Out of range`,
- if it's valid, print `You chose <n>` and stop,
- if the input ends before a valid number, print `No valid input`.

```cpp starter
#include <iostream>
#include <limits>

int main() {
    int n;
    std::cin >> n;
    std::cout << "You chose " << n << '\n';
}
```

```cpp solution
#include <iostream>
#include <limits>

int main() {
    int n;
    while (true) {
        if (std::cin >> n) {
            if (n >= 1 && n <= 10) {
                std::cout << "You chose " << n << '\n';
                return 0;
            }
            std::cout << "Out of range\n";
        } else if (std::cin.eof()) {
            std::cout << "No valid input\n";
            return 0;
        } else {
            std::cout << "Not a number\n";
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        }
    }
}
```

```hint
Check `std::cin.eof()` after a failed read to tell "input ended" apart from "bad input".
```

```hint
`std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');` drops everything up to and
including the next newline.
```

```stdin
hello
42
seven 8
0
5
```

```expected
Not a number
Out of range
Not a number
Out of range
You chose 5
```

```stdin
abc
11
```

```expected hidden
Not a number
Out of range
No valid input
```

```expected
No valid input
```

```checks
must \.clear\s*\( :: Reset the stream with clear().
must \.ignore\s*\( :: Discard the bad line with ignore().
```
:::

:::exercise Directory report
Each input line has a file name and its text, separated by the first space: `notes.txt buy milk`.
Create a directory `ex_report_dir`, and write each file into it containing exactly its text followed by
a newline (a later line with the same name overwrites the earlier file).

Then iterate the directory with `std::filesystem::directory_iterator`, and print `<name> <size>` for
each file **sorted by name**, then `total: <sum of sizes> bytes`. Finally delete the whole directory
with `remove_all`.

```cpp starter
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

int main() {
    const fs::path dir = "ex_report_dir";
    // create the directory, write the files, list them sorted, clean up
}
```

```cpp solution
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

namespace fs = std::filesystem;

int main() {
    const fs::path dir = "ex_report_dir";
    fs::create_directory(dir);

    std::string line;
    while (std::getline(std::cin, line)) {
        std::size_t space = line.find(' ');
        if (space == std::string::npos) continue;
        std::ofstream out(dir / line.substr(0, space));
        out << line.substr(space + 1) << '\n';
    }

    std::vector<std::pair<std::string, std::uintmax_t>> files;
    for (const auto& entry : fs::directory_iterator(dir)) {
        files.emplace_back(entry.path().filename().string(), entry.file_size());
    }
    std::sort(files.begin(), files.end());

    std::uintmax_t total = 0;
    for (const auto& [name, size] : files) {
        std::cout << name << ' ' << size << '\n';
        total += size;
    }
    std::cout << "total: " << total << " bytes\n";
    fs::remove_all(dir);
}
```

```hint
`fs::path` joins with `/`: `std::ofstream out(dir / name);`.
```

```hint
Collect `(name, size)` pairs in a vector, then `std::sort` it, because directory order is unspecified.
```

```stdin
b.txt hello
a.txt hi
c.md a longer line of text
```

```expected
a.txt 3
b.txt 6
c.md 22
total: 31 bytes
```

```stdin
same.txt first version
same.txt v2
```

```expected hidden
same.txt 3
total: 3 bytes
```

```expected
total: 0 bytes
```

```checks
must directory_iterator :: Iterate the directory with std::filesystem::directory_iterator.
must remove_all :: Clean up with remove_all.
```
:::
