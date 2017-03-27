(defproject ib "IB-1.0.6"
            :description "basic microservice."
            :url "https://github.com/ggoldens/ms_users"
            :license { :name "Apache License 2.0"
                       :url "http://www.apache.org/license/LICENSE-2.0.html"}
            :scm { :name "git"
 	         :url "https://github.com/ggoldens/ms_users"}
            :java-source-paths ["src/java"]
            :prep-tasks ["javac" "compile"]
            :dependencies [[org.clojure/clojure "1.6.0"]
                           [com.stuartsierra/component "0.2.2"]
                           [de.otto/tesla-microservice "0.1.11"]
                           [ring/ring-codec "1.0.0"]
                           [org.clojure/java.jdbc "0.3.5"]
                           [jstrutz/hashids "1.0.1"]
                           [liftoff/geoip "0.1.1"]
                           [log4j "1.2.15" :exclusions [javax.mail/mail
                            javax.jms/jms
                            com.sun.jdmk/jmxtools
                            com.sun.jmx/jmxri]]
                           [korma "0.4.0"]
                           [postgresql "9.3-1102.jdbc41"]
                           [com.ning/async-http-client "1.6.3"]
                           [com.tokbox/opentok-server-sdk "2.3.2" :exclusions [com.fasterxml.jackson.core/jackson-databind
                                                                               commons-codec
                                                                               commons-validator
                                                                               com.ning/async-http-client]]]
            :main ib.ib-system
            :clean-targets [:target-path :compile-path "target"]
            :source-paths ["src"]
            :uberjar-name "ib.jar"
            :profiles {:uberjar {:aot :all}}
            :min-lein-version "2.0.0")
