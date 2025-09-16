"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Zap, Users, BarChart3, Lock, ArrowRight, CheckCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function HomePage() {
  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Automated Protection",
      description: "Real-time monitoring with automatic payouts when IL threshold is reached",
      color: "green",
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Confidential Terms",
      description: "Policy details encrypted with FHE technology for maximum privacy",
      color: "blue",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "EigenLayer Security",
      description: "Secured by EigenLayer AVS for robust validation and consensus",
      color: "purple",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Yield Optimization",
      description: "Earn yield from vault deposits while providing insurance coverage",
      color: "orange",
    },
  ];

  const stats = [
    { label: "Total Value Protected", value: "$15.7M", change: "+12.5%" },
    { label: "Active Policies", value: "2,847", change: "+8.2%" },
    { label: "Claims Paid", value: "$425K", change: "+15.1%" },
    { label: "Vault APY", value: "12.3%", change: "+2.1%" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge variant="outline" className="border-green-500/30 text-green-400 mb-6">
              Phase 6: Complete Implementation ✅
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Confidential IL Insurance
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Protect your liquidity positions with advanced impermanent loss insurance powered by
              <span className="text-blue-400"> FHE encryption</span> and
              <span className="text-purple-400"> EigenLayer AVS</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
                  <Shield className="h-5 w-5 mr-2" />
                  Get Protected Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>

              <Link href="/vault">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 px-8 py-3"
                >
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Earn Yield
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <Card key={index} className="bg-black/60 border-gray-600 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-400 mb-2">{stat.label}</div>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                    {stat.change}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Advanced Protection Features</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Experience next-generation DeFi insurance with cutting-edge privacy and security
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const colorClasses = {
                green: "border-green-500/30 text-green-400",
                blue: "border-blue-500/30 text-blue-400",
                purple: "border-purple-500/30 text-purple-400",
                orange: "border-orange-500/30 text-orange-400",
              }[feature.color];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                >
                  <Card
                    className={`bg-black/60 ${colorClasses} backdrop-blur-sm h-full hover:bg-gray-800/40 transition-colors`}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg bg-current bg-opacity-10 ${
                            feature.color === "green"
                              ? "text-green-400"
                              : feature.color === "blue"
                              ? "text-blue-400"
                              : feature.color === "purple"
                              ? "text-purple-400"
                              : "text-orange-400"
                          }`}
                        >
                          {feature.icon}
                        </div>
                        <CardTitle className={colorClasses}>{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-20 bg-black/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-400">Simple steps to protect your liquidity positions</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect & Configure",
                description:
                  "Connect your wallet and set your protection parameters - deductible, coverage cap, and duration.",
                icon: <Shield className="h-8 w-8 text-green-400" />,
              },
              {
                step: "2",
                title: "Deploy Protection",
                description: "Our FHE-encrypted system monitors your position in real-time with complete privacy.",
                icon: <Lock className="h-8 w-8 text-blue-400" />,
              },
              {
                step: "3",
                title: "Automatic Payouts",
                description:
                  "When IL exceeds your threshold, claims are automatically processed and paid out instantly.",
                icon: <Zap className="h-8 w-8 text-purple-400" />,
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-600">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Powered by Cutting-Edge Technology</h2>
            <p className="text-xl text-gray-400">Built on the most advanced privacy and security infrastructure</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Fhenix FHE Encryption</h3>
                  <p className="text-gray-400">
                    Fully homomorphic encryption ensures complete privacy of policy terms and calculations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">EigenLayer AVS</h3>
                  <p className="text-gray-400">Decentralized validation and consensus for trustless claim processing</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Real-time Monitoring</h3>
                  <p className="text-gray-400">
                    Continuous price tracking and IL calculation with instant claim triggers
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Privacy-preserving computations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Decentralized validation network</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Automated claim processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Cross-chain compatibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Quantum-resistant security</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-green-600/10 to-blue-600/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Protect Your Liquidity?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of DeFi users who trust their positions to our advanced insurance protocol
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg">
                  <Shield className="h-6 w-6 mr-2" />
                  Start Protecting
                  <ArrowRight className="h-6 w-6 ml-2" />
                </Button>
              </Link>

              <Link href="/vault">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 px-8 py-4 text-lg"
                >
                  <Users className="h-6 w-6 mr-2" />
                  Become a Provider
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>$15.7M Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span>2,847 Active Policies</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-400" />
                <span>12.3% Vault APY</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-gray-400 text-sm">
            <p className="mb-2">© 2024 Confidential IL Insurance Protocol. Built with ❤️ for the DeFi community.</p>
            <p>Phase 6 Complete: Frontend Polish & Real Transaction Flows ✅</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
