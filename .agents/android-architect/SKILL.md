# Android Architecture Skill

This skill provides the knowledge and tools required to manage the Android architecture for the Cookit project.

## Capabilities
- **Project Structure Analysis:** Analyzing the Android project structure and identifying areas for improvement.
- **Native Integration:** Designing and implementing the bridge between the web layer and native Android features.
- **Dependency Management:** Managing Gradle dependencies and ensuring compatibility.
- **Performance Optimization:** Identifying and fixing performance bottlenecks in the Android application.

## Best Practices
- **Clean Architecture:** Separate concerns between the web layer, Capacitor bridge, and native Android logic.
- **Resource Management:** Optimize usage of Android resources (strings, drawables, layouts).
- **Security:** Follow Android security best practices for data storage and network communication.

## Key Files
- `frontend/android/app/src/main/AndroidManifest.xml`: Main application configuration.
- `frontend/android/app/build.gradle`: App-level build configuration.
- `frontend/android/app/src/main/java/com/cookit/app/`: Native Java source code.
- `plans/android_implementation.md`: The roadmap for Android-related features.

## Workflows
### Adding a Native Feature
1. Update `plans/android_implementation.md` with the feature design.
2. Implement the native logic in `frontend/android/app/src/main/java/`.
3. If needed, create a Capacitor plugin to expose the feature to the web layer.
4. Update `AndroidManifest.xml` with necessary permissions or components.
