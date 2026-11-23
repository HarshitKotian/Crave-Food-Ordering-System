FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B package -DskipTests
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system crave && useradd --system --gid crave crave
COPY --from=build /app/target/food-ordering-1.0.0.jar app.jar
USER crave
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
