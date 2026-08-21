import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  History,
  Trash2,
} from "lucide-react";


import {

  getPostGenerationContentPlans,
  getPostGenerationVoiceInterviews,
  getPostGenerationKnowledgeItems,
  getPostGenerationStylePresets,

  generatePost,
  regeneratePost,
  saveGeneratedPost,
  getSavedGeneratedPosts,

  checkPrivacyGuardrails,
  deleteSavedGeneratedPost,

} from "./prithula";






function PostGeneration({
  token,
  onUnauthorized
}) {



  // =====================================================
  // DATA STATES
  // =====================================================


  const [contentPlans,setContentPlans] =
    useState([]);


  const [voiceInterviews,setVoiceInterviews] =
    useState([]);


  const [knowledgeItems,setKnowledgeItems] =
    useState([]);


  const [stylePresets,setStylePresets] =
    useState([]);



  const [savedPosts,setSavedPosts] =
    useState([]);





  // =====================================================
  // GENERATION SETTINGS
  // =====================================================


  const [sourceType,setSourceType] =
    useState("content_plan");


  const [sourceId,setSourceId] =
    useState("");


  const [selectedKnowledge,setSelectedKnowledge] =
    useState([]);


  const [selectedStyle,setSelectedStyle] =
    useState("");





  // =====================================================
  // POST STATES
  // =====================================================


  const [generatedPost,setGeneratedPost] =
    useState("");


  const [platform,setPlatform] =
    useState("");





  // =====================================================
  // PRIVACY STATES
  // =====================================================


  const [privacyResult,setPrivacyResult] =
    useState(null);


  const [checkingPrivacy,setCheckingPrivacy] =
    useState(false);


  const privacyTimer = useRef(null);





  // =====================================================
  // UI STATES
  // =====================================================


  const [loading,setLoading] =
    useState(true);


  const [generating,setGenerating] =
    useState(false);


  const [regenerating,setRegenerating] =
    useState(false);


  const [saving,setSaving] =
    useState(false);


  const [message,setMessage] =
    useState("");


  const [error,setError] =
    useState("");









  // =====================================================
  // INITIAL LOAD
  // =====================================================


  useEffect(()=>{

    loadResources();

  },[]);







  async function loadResources(){


    try{


      setLoading(true);



      const [

        plans,
        interviews,
        knowledge,
        styles,
        posts

      ] = await Promise.all([


        getPostGenerationContentPlans(token),

        getPostGenerationVoiceInterviews(token),

        getPostGenerationKnowledgeItems(token),

        getPostGenerationStylePresets(token),

        getSavedGeneratedPosts(token),

      ]);




      setContentPlans(plans);

      setVoiceInterviews(interviews);

      setKnowledgeItems(knowledge);

      setStylePresets(styles);

      setSavedPosts(posts);



    }

    catch(error){


      if(error.status===401){

        onUnauthorized();

      }
      else{

        setError(error.message);

      }

    }

    finally{

      setLoading(false);

    }


  }









  // =====================================================
  // PRIVACY CHECK
  // =====================================================


  async function scanPrivacy(text){



    if(!text || !text.trim()){

      setPrivacyResult(null);

      return;

    }





    try{


      setCheckingPrivacy(true);



      const result =
        await checkPrivacyGuardrails(
          token,
          text
        );



      setPrivacyResult(result);



    }

    catch(error){


      console.error(
        "Privacy scan failed:",
        error
      );


    }

    finally{

      setCheckingPrivacy(false);

    }


  }







  // =====================================================
  // DEBOUNCED EDIT SCAN
  // =====================================================


  function handlePostEdit(value){



    setGeneratedPost(value);



    if(privacyTimer.current){

      clearTimeout(
        privacyTimer.current
      );

    }



    privacyTimer.current =
      setTimeout(()=>{


        scanPrivacy(value);


      },700);



  }






  // =====================================================
  // SOURCE CHANGE
  // =====================================================


  function handleSourceTypeChange(e){


    setSourceType(
      e.target.value
    );


    setSourceId("");

  }






  // =====================================================
  // KNOWLEDGE SELECT
  // =====================================================


  function toggleKnowledge(id){


    setSelectedKnowledge(current=>{


      if(current.includes(id)){


        return current.filter(
          item=>item!==id
        );

      }



      return [
        ...current,
        id
      ];


    });


  }
  // =====================================================
// GENERATE POST
// =====================================================


async function handleGenerate(){


  setError("");

  setMessage("");

  setPrivacyResult(null);



  if(!sourceId){


    setError(
      "Please select a source."
    );

    return;

  }





  try{


    setGenerating(true);



    const result =
      await generatePost(
        token,
        {


          source_type:sourceType,


          source_id:sourceId,



          style_preset_id:
            selectedStyle || null,



          knowledge_item_ids:
            selectedKnowledge.length
            ?
            selectedKnowledge
            :
            null,



          post_length:"medium",


          include_hashtags:true,


          include_cta:true,


        }
      );






    setGeneratedPost(
      result.generated_post
    );



    setPlatform(
      result.platform
    );




    // IMPORTANT
    // Backend already scans generated text
    // Display immediately

    setPrivacyResult({

      decision:
        result.privacy_decision,


      violations:
        result.violations || []

    });






    setMessage(
      "Post generated successfully."
    );



  }

  catch(error){


    if(error.status===401){

      onUnauthorized();

    }

    else{


      setError(
        error.message
      );


    }


  }

  finally{


    setGenerating(false);


  }


}









// =====================================================
// REGENERATE POST
// =====================================================


async function handleRegenerate(){


  try{


    setRegenerating(true);

    setError("");




    const previousViolations =
      privacyResult?.violations?.map(
        v=>v.rule_value
      )
      ||
      [];







    const result =
      await regeneratePost(
        token,
        {


          source_type:sourceType,


          source_id:sourceId,



          previous_content:
            generatedPost,



          previous_violations:
            previousViolations,



          style_preset_id:
            selectedStyle || null,



          knowledge_item_ids:
            selectedKnowledge,



          post_length:"medium",



          include_hashtags:true,


          include_cta:true,


        }
      );







    setGeneratedPost(
      result.generated_post
    );



    setPlatform(
      result.platform
    );




    setPrivacyResult({

      decision:
        result.privacy_decision,


      violations:
        result.violations || []

    });





    setMessage(
      "Post regenerated successfully."
    );



  }

  catch(error){


    setError(
      error.message
    );


  }

  finally{


    setRegenerating(false);


  }


}











// =====================================================
// SAVE POST
// =====================================================


async function handleSave(){



  if(!generatedPost.trim()){


    setError(
      "Generated post is empty."
    );

    return;


  }







  // frontend protection

  if(
    privacyResult?.decision==="block"
  ){


    setError(
      "Blocked post cannot be saved."
    );


    return;


  }







  try{


    setSaving(true);

    setError("");





    const saved =
      await saveGeneratedPost(
        token,
        {


          source_type:sourceType,


          source_id:sourceId,


          content:
            generatedPost,



          platform:
            platform || "LinkedIn"


        }
      );







    setSavedPosts(
      current=>[

        saved,
        ...current

      ]
    );





    setMessage(
      "Post saved successfully."
    );



  }

  catch(error){



    /*
      Backend final security layer.

      If user bypasses frontend
      and sends blocked content,
      backend catches it.
    */


    if(
      error.status===400 &&
      error.details
    ){



      setPrivacyResult({

        decision:"block",

        violations:
          error.details.violations || []

      });




      setError(
        error.details.message
        ||
        "Privacy violation detected."
      );



    }

    else{


      setError(
        error.message
      );


    }



  }

  finally{


    setSaving(false);


  }


}












// =====================================================
// DELETE HISTORY POST
// =====================================================


async function handleDelete(postId){



  try{


    await deleteSavedGeneratedPost(
      token,
      postId
    );




    setSavedPosts(
      current=>

        current.filter(
          post=>
            post.post_id !== postId
        )

    );




    setMessage(
      "Post deleted successfully."
    );


  }

  catch(error){


    setError(
      error.message
    );


  }


}

if(loading){


return (

<section className="space-y-6">


<div className="ui-card flex min-h-[18rem] items-center justify-center gap-3">


<Loader2 className="animate-spin"/>


Loading post generation...


</div>


</section>

);


}

return (

<section className="space-y-6">


<header>

<p className="eyebrow">
AI Content Creation
</p>


<h1 className="page-title">
Post Generation
</h1>


<p className="page-subtitle">
Generate posts with real-time privacy protection.
</p>


</header>





{message && (

<div className="status-success">
{message}
</div>

)}




{error && (

<div className="status-error">
{error}
</div>

)}








{/* ============================
GENERATION SETTINGS
============================ */}


<section className="ui-card p-5 space-y-5">


<h2 className="section-title">
Generation Settings
</h2>





<div className="grid md:grid-cols-2 gap-5">



<div>


<label className="field-label">
Source Type
</label>


<select

className="form-input"

value={sourceType}

onChange={handleSourceTypeChange}

>


<option value="content_plan">
Content Plan
</option>


<option value="voice_interview">
Voice Interview
</option>


</select>


</div>







<div>


<label className="field-label">
Source
</label>



<select

className="form-input"

value={sourceId}

onChange={
e=>setSourceId(e.target.value)
}

>


<option value="">
Select source
</option>



{

(
sourceType==="content_plan"
?
contentPlans
:
voiceInterviews

)

.map(item=>(


<option

key={
item.content_plan_id ||
item.interview_id
}


value={
item.content_plan_id ||
item.interview_id
}

>


{
item.title ||
"Voice Interview"
}


</option>


))


}


</select>



</div>


</div>







<div>


<label className="field-label">
Writing Style
</label>



<select

className="form-input"

value={selectedStyle}

onChange={
e=>setSelectedStyle(e.target.value)
}

>


<option value="">
Default Style
</option>


{

stylePresets.map(style=>(


<option

key={style.preset_id}

value={style.preset_id}

>

{style.preset_name}

</option>


))


}


</select>



</div>







<div>


<label className="field-label">
Knowledge Vault
</label>


<div className="grid md:grid-cols-2 gap-2">


{

knowledgeItems.map(item=>(


<label

key={item.item_id}

className="border rounded-lg p-3 flex gap-2"


>


<input

type="checkbox"

checked={
selectedKnowledge.includes(
item.item_id
)

}


onChange={
()=>toggleKnowledge(
item.item_id
)

}


/>


<span>
{item.title}
</span>


</label>


))


}


</div>


</div>






<button

className="btn-primary"

disabled={generating}

onClick={handleGenerate}

>


{

generating ?

<Loader2 className="animate-spin"/>

:

<Sparkles/>

}


Generate Post


</button>




</section>












{/* ============================
GENERATED POST
============================ */}



{

generatedPost && (


<section className="ui-card p-5 space-y-5">



<div className="flex items-center gap-3">


<FileText/>


<h2 className="section-title">

Generated Post

</h2>


</div>







<textarea


className="form-input min-h-[18rem]"


value={generatedPost}


onChange={e=>{


const value=e.target.value;


setGeneratedPost(value);


// automatic privacy scan

scanPrivacy(value);


}}


/>










<div className="flex gap-3 flex-wrap">


<button

className="btn-secondary"

disabled={regenerating}

onClick={handleRegenerate}

>


<RefreshCw/>


Regenerate


</button>








<button


className="btn-primary"


disabled={

saving ||

privacyResult?.decision==="block"

}


onClick={handleSave}


>


<Save/>


Save Post


</button>



</div>









{/* =====================
PRIVACY RESULT
===================== */}



<div className="border rounded-lg p-5">


<h3 className="font-semibold text-lg">

Privacy Guardrail Result

</h3>







{

checkingPrivacy &&

<p className="mt-3">
Checking privacy...
</p>

}










{

privacyResult &&


<div className="mt-4 space-y-4">






{/* PASS */}

{

privacyResult.decision==="pass"

&&

<div className="rounded-lg border p-4">


<CheckCircle2 className="inline mr-2"/>


🟢 Safe


<br/>


Save enabled.


</div>


}








{/* WARN */}



{

privacyResult.decision==="warn"

&&


<div className="rounded-lg border p-4">


<AlertTriangle className="inline mr-2"/>


🟡 Warning


<br/>


This post can be saved.



</div>



}








{/* BLOCK */}


{

privacyResult.decision==="block"

&&


<div className="rounded-lg border p-4">


<AlertTriangle className="inline mr-2"/>


🔴 Blocked


<br/>


Saving disabled.


</div>


}





{/* VIOLATIONS */}


{

privacyResult.violations?.length>0 &&


<div className="space-y-3">


<h4 className="font-semibold">

Detected Privacy Issues:

</h4>




{

privacyResult.violations.map(
(v,index)=>(


<div

key={index}

className="rounded-lg border p-4"


>



<p>

<strong>
Rule:
</strong>

{" "}

{v.rule_name}

</p>



<p>

<strong>
Forbidden Phrase:
</strong>

{" "}

{v.rule_value}

</p>



<p>

<strong>
Type:
</strong>

{" "}

{v.rule_type}

</p>



<p>

<strong>
Severity:
</strong>

{" "}

{v.severity}

</p>



<p>

<strong>
Action:
</strong>

{" "}

{v.action}

</p>



</div>


)

)



}



</div>


}



</div>


}




</div>






</section>


)


}














{/* ============================
HISTORY
============================ */}



<section className="ui-card p-5">



<div className="flex items-center gap-3">


<History/>


<h2 className="section-title">

Saved Posts History

</h2>


</div>








<div className="mt-5 space-y-3">



{

savedPosts.length===0 &&


<p className="text-sm text-zinc-500">

No saved posts yet.

</p>


}







{

savedPosts.map(post=>(


<div

key={post.post_id}

className="border rounded-lg p-4"


>



<p className="line-clamp-4 text-sm">

{post.content}

</p>




<p className="text-xs text-zinc-500 mt-2">

{post.platform}

</p>






<button

className="btn-danger mt-3"

onClick={
()=>handleDelete(
post.post_id
)

}


>


<Trash2 className="inline h-4 w-4"/>


Delete


</button>




</div>


))


}



</div>





</section>






</section>


);
}
export default PostGeneration;  
