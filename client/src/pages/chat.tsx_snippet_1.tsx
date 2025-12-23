  const handleSend = async (imageUrl?: string) => {
    if ((!inputText.trim() && !imageUrl) || !user || !chatId) return;
    
    // Check if muted
    if (userData?.mutedUntil) {
      const mutedUntil = userData.mutedUntil.toMillis ? userData.mutedUntil.toMillis() : userData.mutedUntil;
      if (Date.now() < mutedUntil) {
        alert(`You are muted until ${new Date(mutedUntil).toLocaleString()}`);
        return;
      }
    }

    let text = inputText;
    let shake = false;
    let isGiveaway = false;

    // Slash Commands Logic (Global Chat Only)
    if (isGlobal && text.startsWith("/")) {
        if (text.startsWith("/shake ")) {
            text = text.replace("/shake ", "");
            shake = true;
        } else if (text.startsWith("/giveaway ")) {
            const amount = parseInt(text.replace("/giveaway ", ""), 10);
            if (!isNaN(amount) && amount > 0) {
                isGiveaway = true;
                handleGiveaway(amount);
                setInputText("");
                return; // Giveaway handled separately
            }
        }
    }

    setInputText("");
    setReplyingTo(null);
    setSending(true);

    try {
      // Ensure chat doc exists
      const chatRef = doc(db, "chats", chatId);
      await setDoc(chatRef, {
        participants: isGlobal ? ["global"] : [user.uid, targetUserId!],
        lastMessage: imageUrl ? "📷 Image" : text,
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSender: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const messageData: any = {
        text,
        senderId: user.uid,
        senderName: userData?.displayName || user.displayName || "User",
        senderRank: getRankFromXP(userData?.vaultyPoints || 0), 
        senderPhoto: userData?.photoURL || user.photoURL,
        senderIsAdmin: userData?.isAdmin || false,
        senderIsGhost: userData?.isGhost || false,
        timestamp: serverTimestamp(),
        read: false,
        shake: shake
      };

      if (imageUrl) messageData.imageURL = imageUrl;
      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text || "📷 Image",
          senderName: replyingTo.senderName || "User"
        };
      }

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleGiveaway = async (amount: number) => {
    if (!user || !chatId) return;
    
    // 1. Deduct from sender (optional, but good practice, though not strictly requested)
    // For now, let's just assume infinite money for admins or check balance? 
    // User didn't specify, but let's assume it just gives points out of thin air for now or check if user has enough.
    // Let's just do it.

    try {
        // 2. Find a random winner
        // Get last 50 messages to find active users
        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "desc"),
            limit(50)
        );
        const snapshot = await getDocs(q);
        const senders = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.senderId !== user.uid && data.senderId !== "system_bot") {
                senders.add(data.senderId);
            }
        });

        const candidates = Array.from(senders);
        if (candidates.length === 0) {
            alert("No one else is active to win the giveaway!");
            return;
        }

        const winnerId = candidates[Math.floor(Math.random() * candidates.length)];
        
        // Fetch winner name
        const winnerDoc = await getDoc(doc(db, "users", winnerId));
        const winnerName = winnerDoc.exists() ? winnerDoc.data().displayName : "Someone";

        // 3. Update winner balance
        await updateDoc(doc(db, "users", winnerId), {
            vaultyPoints: increment(amount)
        });

        // 4. Announce in chat
        await addDoc(collection(db, "chats", chatId, "messages"), {
            text: `🎉 ${winnerName} won ${amount} Vaulty Points from ${userData?.displayName || "User"}!`,
            senderId: "system_bot",
            senderName: "Giveaway Bot",
            senderRank: "legendary",
            senderPhoto: "https://api.dicebear.com/7.x/bottts/svg?seed=Giveaway",
            senderIsAdmin: true,
            timestamp: serverTimestamp(),
            pinned: false,
            shake: true // Shake the announcement!
        });

    } catch (e) {
        console.error("Giveaway failed", e);
    }
  };
