const OpenAI = require('openai');

import { getSession, withApiAuthRequired} from "@auth0/nextjs-auth0";
import clientPromise from "../../lib/mongodb";



export default withApiAuthRequired (async function handler(req, res) {
  

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
  });
  
  const{user} = await getSession(req,res);
  const client = await clientPromise;
  const db = client.db("BlogStandard");

  
  const userProfile = await db.collection("users").findOne({
    auth0Id: user.sub
  })

  if(!userProfile?.availableTokens){
    res.status(403);
    return;
  }

 
  

  const {topic, keywords} = req.body;

  const response = await openai.chat.completions.create({
    messages: [{ role: 'user', content:  `Write a long and detailed SEO-friendly blog post about ${topic}, that targets the following comma-seperated keywords ${keywords}. 
        The content should be formatted in SEO-friendly HTML.
        The response must also include appropritate HTML title and meta description content.
        The return format must be stringified JSON in the following format:
        {
          "postContent": post content here,
          "title": title goes here,
          "metaDescription": meta description goes here,
        }`, 
      
      }],
    model: 'gpt-4-1106-preview',
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  await db.collection("users").updateOne({
    auth0Id: user.sub
  },{
      $inc: {
         availableTokens: -1
      }
  });
  

  
  
 
  const post = await db.collection("posts").insertOne({
    postContent:parsed?.postContent,
    title: parsed?.title,
    metaDescription: parsed?.metaDescription,
    topic,
    keywords,
    userId: userProfile._id,
    created: new Date(),
  });
    res.status(200).json({
      postId: post.insertedId,

    });
  })
  
  

