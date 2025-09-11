"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Eye, TrendingUp, Lock, Users } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const features = [
    {
      icon: Shield,
      title: "Confidential Computing",
      description: "Your position data is encrypted using Fhenix FHE, ensuring complete privacy while calculating IL.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Zap,
      title: "Automated Premiums",
      description: "Insurance premiums are automatically collected from swap fees, no manual payments required.",
      color: "from-green-600 to-green-400",
    },
    {
      icon: Eye,
      title: "Decentralized Verification",
      description: "EigenLayer AVS ensures trustless verification of claims and payouts through operator consensus.",
      color: "from-emerald-500 to-green-500",
    },
  ];

  const stats = [
    { label: "Total Value Locked", value: "$0", icon: TrendingUp },
    { label: "Active Policies", value: "0", icon: Lock },
    { label: "Protected LPs", value: "0", icon: Users },
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(120,119,198,0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(255,119,198,0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 80%, rgba(119,255,198,0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(120,119,198,0.3) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 8,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <motion.div className="flex items-center space-x-2" whileHover={{ scale: 1.05 }}>
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  IL Insurance
                </span>
              </motion.div>

              <motion.button
                onClick={() => open()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white font-medium hover:shadow-neon transition-all duration-300"
              >
                {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect Wallet"}
              </motion.button>
            </div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="pt-32 pb-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto text-center">
            <motion.div variants={itemVariants} className="mb-8">
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                  Protect Your LP
                </span>
                <br />
                <span className="text-white">Positions with</span>
                <br />
                <motion.span
                  className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                  }}
                >
                  Confidential Insurance
                </motion.span>
              </h1>
            </motion.div>

            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto">
              Get impermanent loss insurance for your Uniswap v4 liquidity positions using cutting-edge{" "}
              <span className="text-green-400">Fhenix FHE technology</span> and{" "}
              <span className="text-emerald-400">EigenLayer verification</span>.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white font-semibold text-lg shadow-neon"
              >
                Launch App
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border border-white/20 backdrop-blur-sm rounded-lg text-white font-semibold text-lg hover:bg-white/5 transition-all duration-300"
              >
                View Vault Stats
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="glass-dark p-6 rounded-xl backdrop-blur-md"
                >
                  <stat.icon className="w-8 h-8 text-green-400 mx-auto mb-4" />
                  <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Why Choose{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Our Platform
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Experience the future of DeFi insurance with privacy-preserving technology and decentralized
                verification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  whileHover={{
                    scale: 1.05,
                    y: -10,
                    transition: { duration: 0.3 },
                  }}
                  viewport={{ once: true }}
                  className="glass-dark p-8 rounded-2xl backdrop-blur-md hover:shadow-neon-purple transition-all duration-300"
                >
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 mx-auto`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 text-center">{feature.title}</h3>
                  <p className="text-gray-300 text-center">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Protocol Statistics */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              className="glass-dark p-12 rounded-3xl backdrop-blur-md"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Ready to protect your{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                  liquidity positions
                </span>
                ?
              </h2>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                Join the next generation of DeFi insurance powered by confidential computing and decentralized
                verification.
              </p>
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 0 40px rgba(59, 130, 246, 0.6)",
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => open()}
                className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white font-bold text-xl shadow-neon animate-pulse-glow"
              >
                Get Started Now
              </motion.button>
            </motion.div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
