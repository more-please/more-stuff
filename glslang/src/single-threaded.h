// glslang guards its process-wide setup with a std::mutex, which libc++ leaves
// out when built without threads, as it is for wasm32-wasi. The module is
// single-threaded, so a lock that does nothing is enough. Force-included into
// every source file.

#pragma once
#include <__config>

#if !_LIBCPP_HAS_THREADS
namespace std {
struct mutex {
  void lock() {}
  void unlock() {}
};
template <class Mutex>
struct lock_guard {
  explicit lock_guard(Mutex&) {}
};
}  // namespace std
#endif
